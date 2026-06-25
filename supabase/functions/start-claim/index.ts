import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logMemberEmailEvent } from "../_shared/member-email-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_LINK_VALID_DAYS = 7;
const AWAITING_EMAIL_STATUS = "awaiting_email_verification";

function emailVerificationExpiresAt(from = new Date()) {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + EMAIL_LINK_VALID_DAYS);
  return expires.toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRoll(roll: string) {
  const trimmed = roll.trim();
  if (!/^\d+$/.test(trimmed)) return "";
  return String(parseInt(trimmed, 10));
}

const ACTIVE_REQUEST_STATUSES = [
  AWAITING_EMAIL_STATUS,
  "pending_review",
  "more_info_required",
] as const;

async function findActiveRequestByRoll(
  adminClient: ReturnType<typeof createClient>,
  rollNumber: string
) {
  const { data } = await adminClient
    .from("approval_requests")
    .select("id, created_at, type, status, email_verification_expires_at")
    .eq("roll_number", rollNumber)
    .in("status", [...ACTIVE_REQUEST_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || data.status !== AWAITING_EMAIL_STATUS) {
    return data;
  }

  const expiresAt = data.email_verification_expires_at
    ? new Date(data.email_verification_expires_at)
    : null;
  if (!expiresAt || expiresAt < new Date()) {
    return null;
  }

  return data;
}

function activeRequestResponse(
  rollNumber: string,
  pending: { id: string; created_at: string; type: string; status: string }
) {
  const label = pending.type.replace(/_/g, " ");
  const phase =
    pending.status === AWAITING_EMAIL_STATUS
      ? "awaiting email verification"
      : "awaiting admin review";
  return new Response(
    JSON.stringify({
      error: "already_pending",
      status: "already_pending",
      message:
        `A ${label} request for roll ${rollNumber} is already ${phase}. ` +
        "Please check your email or wait for an admin decision — do not submit again.",
      request_id: pending.id,
      submitted_at: pending.created_at,
    }),
    {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

const EMAIL_REQUIRED_MESSAGE =
  "We've sent a verification link to your email. You must click it to complete your claim — " +
  "only then will your request be sent for admin review. The link is valid for 7 days.";

const VERIFICATION_FAILED_MESSAGE =
  "We could not verify the details you entered. Please check your roll number and contact information and try again.";

function verificationFailedResponse() {
  return new Response(
    JSON.stringify({
      error: "verification_failed",
      status: "verification_failed",
      message: VERIFICATION_FAILED_MESSAGE,
    }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function sendVerificationOtp(
  anonClient: ReturnType<typeof createClient>,
  email: string,
  emailRedirectTo?: string
) {
  const { error: otpError } = await anonClient.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo,
    },
  });
  if (otpError) throw otpError;
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

    const body = await req.json();
    const rollNumber = normalizeRoll(body.roll_number ?? "");
    const email = normalizeEmail(body.email ?? "");
    const emailRedirectTo = body.email_redirect_to ?? undefined;

    if (!rollNumber || !email) {
      return new Response(JSON.stringify({ error: "roll_number and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.rpc("expire_stale_email_verifications");

    const { data: member, error: memberError } = await adminClient
      .from("alumni_members")
      .select("*")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return verificationFailedResponse();
    }

    if (member.status !== "imported_unclaimed" && member.user_id) {
      return new Response(JSON.stringify({
        error: "already_claimed",
        message: "This alumni profile is already linked to an account. Try signing in or contact the administrator.",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const active = await findActiveRequestByRoll(adminClient, rollNumber);
    if (active) return activeRequestResponse(rollNumber, active);

    const emailMatch = member.email && normalizeEmail(member.email) === email;
    const phoneMatch = body.phone && member.mobile_phone &&
      member.mobile_phone.replace(/\D/g, "") === String(body.phone).replace(/\D/g, "");
    const dobMatch = body.date_of_birth && member.date_of_birth === body.date_of_birth;
    const autoMatched = emailMatch || phoneMatch || dobMatch;

    if (!autoMatched) {
      return verificationFailedResponse();
    }

    await sendVerificationOtp(anonClient, email, emailRedirectTo);

    const expiresAt = emailVerificationExpiresAt();

    const { data: request, error: reqError } = await adminClient
      .from("approval_requests")
      .insert({
        type: "claim",
        status: AWAITING_EMAIL_STATUS,
        roll_number: rollNumber,
        submitted_email: email,
        submitted_name: member.name,
        submitted_phone: body.phone ?? null,
        submitted_dob: body.date_of_birth ?? null,
        alumni_member_id: member.id,
        user_id: user?.id ?? null,
        email_verification_expires_at: expiresAt,
        submitted_payload: { verification: "auto_matched" },
      })
      .select()
      .single();

    if (reqError) throw reqError;

    await logMemberEmailEvent(adminClient, {
      alumniMemberId: member.id,
      approvalRequestId: request.id,
      emailType: "claim_verification",
      provider: "auth_service",
      recipient: email,
      status: "sent_to_auth_service",
      triggerSource: user?.id ?? "member",
    });

    return new Response(JSON.stringify({
      status: "awaiting_email",
      message: EMAIL_REQUIRED_MESSAGE,
      request_id: request.id,
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
