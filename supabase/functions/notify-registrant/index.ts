import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

async function logMemberEmailEvent(
  adminClient: ReturnType<typeof createClient>,
  p: {
    alumniMemberId?: string | null;
    approvalRequestId?: string | null;
    emailType: string;
    provider: "auth_service" | "resend";
    recipient: string;
    status: string;
    messageId?: string | null;
    errorMessage?: string | null;
    triggerSource?: string;
  }
) {
  const { error } = await adminClient.rpc("log_member_email_event", {
    p_email_type: p.emailType,
    p_provider: p.provider,
    p_recipient: p.recipient,
    p_alumni_member_id: p.alumniMemberId ?? null,
    p_approval_request_id: p.approvalRequestId ?? null,
    p_status: p.status,
    p_message_id: p.messageId ?? null,
    p_error_message: p.errorMessage ?? null,
    p_trigger_source: p.triggerSource ?? "system",
  });
  if (error) console.error("log_member_email_event:", error.message);
}

function notifyEmailType(event: string, requestType: string): string {
  if (event === "approved") {
    return requestType === "claim" ? "claim_approved" : "registration_approved";
  }
  if (event === "rejected") return "request_rejected";
  if (event === "more_info") return "more_info_required";
  return "request_submitted";
}

function resendEmailStatus(ok: boolean, resendId?: string | null) {
  if (!ok) return { status: "failed", messageId: null };
  return { status: "sent", messageId: resendId ?? null };
}

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

async function requireAdmin(userClient: ReturnType<typeof createClient>, adminClient: ReturnType<typeof createClient>) {
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    return { error: "Admin access required", status: 403 as const };
  }

  return { user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { request_id, event, note, trigger_source } = body as {
      request_id: string;
      event: NotifyEvent;
      note?: string;
      trigger_source?: string;
    };

    if (!request_id || !event) {
      return new Response(JSON.stringify({ error: "request_id and event required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminCheck = await requireAdmin(userClient, adminClient);
    if ("error" in adminCheck) {
      return new Response(JSON.stringify({ error: adminCheck.error }), {
        status: adminCheck.status,
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
    const emailType = notifyEmailType(event, request.type);
    const source = trigger_source ?? adminCheck.user.id;

    let emailed = false;
    let resendId: string | null = null;

    if (resendKey) {
      const from = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "alumni@example.com";
      const res = await fetch("https://api.resend.com/emails", {
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

      emailed = res.ok;
      if (res.ok) {
        const payload = await res.json().catch(() => ({})) as { id?: string };
        resendId = payload.id ?? null;
      } else {
        const errText = await res.text().catch(() => "Resend API error");
        await logMemberEmailEvent(adminClient, {
          alumniMemberId: request.alumni_member_id,
          approvalRequestId: request.id,
          emailType,
          provider: "resend",
          recipient: request.submitted_email,
          status: "failed",
          errorMessage: errText.slice(0, 500),
          triggerSource: source,
        });
        return new Response(JSON.stringify({ error: "Unable to send email", detail: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { status, messageId } = resendEmailStatus(emailed || !resendKey, resendId);
    await logMemberEmailEvent(adminClient, {
      alumniMemberId: request.alumni_member_id,
      approvalRequestId: request.id,
      emailType,
      provider: "resend",
      recipient: request.submitted_email,
      status: resendKey ? status : "unknown",
      messageId,
      errorMessage: resendKey ? null : "RESEND_API_KEY not configured",
      triggerSource: source,
    });

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
