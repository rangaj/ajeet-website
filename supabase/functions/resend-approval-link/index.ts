import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logMemberEmailEvent } from "../_shared/member-email-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_LINK_VALID_DAYS = 7;
const AWAITING_EMAIL_STATUS = "awaiting_email_verification";
const EXPIRED_STATUS = "expired";

function emailVerificationExpiresAt(from = new Date()) {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + EMAIL_LINK_VALID_DAYS);
  return expires.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });
    const anonClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" && profile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { request_id, email_redirect_to } = body as {
      request_id?: string;
      email_redirect_to?: string;
    };

    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.rpc("expire_stale_email_verifications");

    const { data: request } = await adminClient
      .from("approval_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (!request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      request.status !== AWAITING_EMAIL_STATUS &&
      request.status !== EXPIRED_STATUS
    ) {
      return new Response(JSON.stringify({
        error: "Only awaiting or expired email-link requests can be resent",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectTo = email_redirect_to ??
      `${Deno.env.get("APP_SITE_URL") ?? "https://new.ajeets.org"}/pending`;

    const { error: otpError } = await anonClient.auth.signInWithOtp({
      email: request.submitted_email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    const expiresAt = emailVerificationExpiresAt();

    if (!otpError) {
      const { error: updateError } = await adminClient
        .from("approval_requests")
        .update({
          status: AWAITING_EMAIL_STATUS,
          email_verification_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request_id);

      if (updateError) throw updateError;
    }

    await logMemberEmailEvent(adminClient, {
      alumniMemberId: request.alumni_member_id,
      approvalRequestId: request.id,
      emailType: request.type === "claim" ? "claim_verification" : "registration_verification",
      provider: "auth_service",
      recipient: request.submitted_email,
      status: otpError ? "failed" : "sent_to_auth_service",
      errorMessage: otpError?.message ?? null,
      triggerSource: user.id,
    });
    if (otpError) throw otpError;

    return new Response(JSON.stringify({
      ok: true,
      message: "Verification link resent. Valid for 7 days.",
      email_verification_expires_at: expiresAt,
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
