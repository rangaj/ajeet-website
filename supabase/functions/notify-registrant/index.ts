import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyEvent = "submitted" | "approved" | "rejected" | "more_info";

const templates: Record<NotifyEvent, { subject: string; body: (ctx: Record<string, string>) => string }> = {
  submitted: {
    subject: "Alumni registration received",
    body: (ctx) =>
      `Hello ${ctx.name},\n\nWe received your alumni registration for roll number ${ctx.roll_number}. An admin will review it shortly.\n\n— School Alumni Association`,
  },
  approved: {
    subject: "Alumni registration approved",
    body: (ctx) =>
      `Hello ${ctx.name},\n\nYour alumni registration has been approved. You can now sign in and access the directory.\n\n— School Alumni Association`,
  },
  rejected: {
    subject: "Alumni registration update",
    body: (ctx) =>
      `Hello ${ctx.name},\n\nYour alumni registration could not be approved.${ctx.note ? `\n\nNote: ${ctx.note}` : ""}\n\n— School Alumni Association`,
  },
  more_info: {
    subject: "More information needed — alumni registration",
    body: (ctx) =>
      `Hello ${ctx.name},\n\nWe need more information to process your registration.${ctx.note ? `\n\nNote: ${ctx.note}` : ""}\n\n— School Alumni Association`,
  },
};

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
        headers: corsHeaders,
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

    const template = templates[event];
    const ctx = {
      name: request.submitted_name ?? "Alumni",
      roll_number: request.roll_number,
      note: note ?? request.reviewer_note ?? "",
    };

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
          text: template.body(ctx),
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
