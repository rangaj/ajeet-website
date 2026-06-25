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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_LINK_VALID_DAYS = 7;
const AWAITING_EMAIL_STATUS = "awaiting_email_verification";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailVerificationExpiresAt(from = new Date()) {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + EMAIL_LINK_VALID_DAYS);
  return expires.toISOString();
}

function appSiteUrl() {
  return (Deno.env.get("APP_SITE_URL") ?? "https://new.ajeets.org").replace(/\/$/, "");
}

async function requireAdmin(
  userClient: ReturnType<typeof createClient>,
  adminClient: ReturnType<typeof createClient>
) {
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

async function sendAuthVerification(
  anonClient: ReturnType<typeof createClient>,
  email: string,
  redirectTo: string
) {
  const { error } = await anonClient.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });
  return error;
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

    const adminCheck = await requireAdmin(userClient, adminClient);
    if ("error" in adminCheck) {
      return new Response(JSON.stringify({ error: adminCheck.error }), {
        status: adminCheck.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const memberId = body.member_id as string | undefined;
    const newEmail = normalizeEmail(body.new_email ?? "");

    if (!memberId || !newEmail) {
      return new Response(JSON.stringify({ error: "member_id and new_email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("alumni_members")
      .select("*")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const previousEmail = member.email;
    const now = new Date().toISOString();
    const isActiveMember = Boolean(member.user_id) && member.status === "approved";

    const memberPatch: Record<string, unknown> = {
      email: newEmail,
      updated_at: now,
    };

    if (isActiveMember) {
      memberPatch.pending_email = newEmail;
      memberPatch.email_change_requested_at = now;
    } else {
      memberPatch.pending_email = null;
      memberPatch.email_change_requested_at = null;
    }

    const { error: updateMemberError } = await adminClient
      .from("alumni_members")
      .update(memberPatch)
      .eq("id", memberId);

    if (updateMemberError) throw updateMemberError;

    await adminClient
      .from("approval_requests")
      .update({ submitted_email: newEmail, updated_at: now })
      .eq("roll_number", member.roll_number)
      .in("status", [
        AWAITING_EMAIL_STATUS,
        "pending_review",
        "more_info_required",
        "expired",
      ]);

    if (isActiveMember && member.user_id) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        member.user_id,
        { email: newEmail, email_confirm: false }
      );
      if (authUpdateError) throw authUpdateError;
    }

    let verificationSent = false;
    let verificationError: string | null = null;
    const redirectTo = `${appSiteUrl()}/pending`;

    if (isActiveMember) {
      const otpError = await sendAuthVerification(anonClient, newEmail, redirectTo);
      verificationSent = !otpError;
      verificationError = otpError?.message ?? null;

      await logMemberEmailEvent(adminClient, {
        alumniMemberId: memberId,
        emailType: "email_change_verification",
        provider: "auth_service",
        recipient: newEmail,
        status: otpError ? "failed" : "sent_to_auth_service",
        errorMessage: verificationError,
        triggerSource: adminCheck.user.id,
      });
    } else {
      const { data: awaitingRequest } = await adminClient
        .from("approval_requests")
        .select("id, status")
        .eq("roll_number", member.roll_number)
        .in("status", [AWAITING_EMAIL_STATUS, "expired"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (awaitingRequest) {
        const expiresAt = emailVerificationExpiresAt();
        const otpError = await sendAuthVerification(anonClient, newEmail, redirectTo);
        verificationSent = !otpError;
        verificationError = otpError?.message ?? null;

        if (!otpError) {
          await adminClient
            .from("approval_requests")
            .update({
              status: AWAITING_EMAIL_STATUS,
              submitted_email: newEmail,
              email_verification_expires_at: expiresAt,
              updated_at: now,
            })
            .eq("id", awaitingRequest.id);
        }

        const emailType = member.status === "imported_unclaimed"
          ? "claim_verification"
          : "registration_verification";

        await logMemberEmailEvent(adminClient, {
          alumniMemberId: memberId,
          approvalRequestId: awaitingRequest.id,
          emailType,
          provider: "auth_service",
          recipient: newEmail,
          status: otpError ? "failed" : "sent_to_auth_service",
          errorMessage: verificationError,
          triggerSource: adminCheck.user.id,
        });
      }
    }

    await adminClient.from("admin_audit_log").insert({
      actor_id: adminCheck.user.id,
      action: "member_email_updated",
      entity_type: "alumni_member",
      entity_id: memberId,
      details: {
        roll_number: member.roll_number,
        previous_email: previousEmail,
        new_email: newEmail,
        email_change_pending: isActiveMember,
        verification_sent: verificationSent,
      },
    });

    await adminClient.from("member_support_notes").insert({
      alumni_member_id: memberId,
      author_id: adminCheck.user.id,
      body: `Updated email address from ${previousEmail ?? "(none)"} to ${newEmail}.`,
    });

    return new Response(JSON.stringify({
      ok: true,
      previous_email: previousEmail,
      current_email: newEmail,
      email_change_pending: isActiveMember,
      verification_sent: verificationSent,
      verification_error: verificationError,
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
