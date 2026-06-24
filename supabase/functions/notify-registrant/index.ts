import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyEvent = "submitted" | "approved" | "rejected" | "more_info";

function appSiteUrl() {
  return (Deno.env.get("APP_SITE_URL") ?? "https://new.ajeets.org").replace(/\/$/, "");
}

function templates(event: NotifyEvent, ctx: Record<string, string>) {
  const loginUrl = `${appSiteUrl()}/login`;

  switch (event) {
    case "submitted":
      return {
        subject: "Ajeet alumni request received",
        text:
          `Hello ${ctx.name},\n\nWe received your ${ctx.request_label} for roll number ${ctx.roll_number}. ` +
          `An admin will review it shortly.\n\n— Ajeets Alumni`,
      };
    case "approved":
      return {
        subject: "Your Ajeet alumni access is approved",
        text:
          `Hello ${ctx.name},\n\n` +
          `Your Ajeet alumni access has been approved (roll ${ctx.roll_number}).\n\n` +
          `Set your password (recommended):\n${ctx.password_setup_link}\n\n` +
          `Or sign in anytime with a magic link:\n${loginUrl}\n\n` +
          `— Ajeets Alumni`,
      };
    case "rejected":
      return {
        subject: "Ajeet alumni request update",
        text:
          `Hello ${ctx.name},\n\nYour ${ctx.request_label} could not be approved.` +
          `${ctx.note ? `\n\nNote: ${ctx.note}` : ""}\n\n— Ajeets Alumni`,
      };
    case "more_info":
      return {
        subject: "More information needed — Ajeet alumni",
        text:
          `Hello ${ctx.name},\n\nWe need more information to process your ${ctx.request_label}.` +
          `${ctx.note ? `\n\nNote: ${ctx.note}` : ""}\n\n— Ajeets Alumni`,
      };
  }
}

function requestLabel(type: string) {
  if (type === "claim") return "claim request";
  if (type === "new_registration") return "registration";
  return type.replace(/_/g, " ");
}

async function passwordSetupLink(
  adminClient: ReturnType<typeof createClient>,
  email: string
) {
  const redirectTo = `${appSiteUrl()}/reset-password`;
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) throw error;
  return data.properties?.action_link ?? redirectTo;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { request_id, event, note } = body as {
      request_id: string;
      event: NotifyEvent;
      note?: string;
    };

    if (!request_id || !event) {
      return new Response(JSON.stringify({ error: "request_id and event required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: request } = await adminClient
      .from("approval_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (!request) {
      return new Response(JSON.stringify({ error: "Request not found" }), { status: 404, headers: corsHeaders });
    }

    const ctx: Record<string, string> = {
      name: request.submitted_name ?? "Alumni",
      roll_number: request.roll_number,
      note: note ?? request.reviewer_note ?? "",
      request_label: requestLabel(request.type),
      password_setup_link: "",
    };

    if (event === "approved") {
      ctx.password_setup_link = await passwordSetupLink(adminClient, request.submitted_email);
    }

    const template = templates(event, ctx);

    if (resendKey) {
      const from = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "alumni@example.com";
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: request.submitted_email,
          subject: template.subject,
          text: template.text,
        }),
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      emailed: Boolean(resendKey),
      event,
      to: request.submitted_email,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
