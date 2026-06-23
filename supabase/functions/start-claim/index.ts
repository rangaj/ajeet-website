import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  AWAITING_EMAIL_STATUS,
  emailVerificationExpiresAt,
} from "../_shared/email-verification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRoll(roll: string) {
  const trimmed = roll.trim();
  if (!/^\d+$/.test(trimmed)) return "";
  return String(parseInt(trimmed, 10));
}

const REVIEW_QUEUE_STATUSES = ["pending_review", "more_info_required"] as const;

async function findInReviewByRoll(
  adminClient: ReturnType<typeof createClient>,
  rollNumber: string
) {
  const { data } = await adminClient
    .from("approval_requests")
    .select("id, created_at, type, status")
    .eq("roll_number", rollNumber)
    .in("status", [...REVIEW_QUEUE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function findAwaitingByRoll(
  adminClient: ReturnType<typeof createClient>,
  rollNumber: string
) {
  const { data } = await adminClient
    .from("approval_requests")
    .select("id, created_at, type, status, email_verification_expires_at")
    .eq("roll_number", rollNumber)
    .eq("status", AWAITING_EMAIL_STATUS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function inReviewResponse(rollNumber: string, pending: { id: string; created_at: string; type: string }) {
  const label = pending.type.replace(/_/g, " ");
  return new Response(
    JSON.stringify({
      error: "already_pending",
      status: "already_pending",
      message:
        `A ${label} request for roll ${rollNumber} is already awaiting admin review. ` +
        "Please wait for admin review or check your email — do not submit again.",
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

const EMAIL_RESENT_MESSAGE =
  "A verification link was already sent. We've sent it again — you must click the link in your email " +
  "to complete your claim. The link is valid for 7 days.";

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

    const inReview = await findInReviewByRoll(adminClient, rollNumber);
    if (inReview) return inReviewResponse(rollNumber, inReview);

    const awaiting = await findAwaitingByRoll(adminClient, rollNumber);
    if (awaiting) {
      const expiresAt = awaiting.email_verification_expires_at
        ? new Date(awaiting.email_verification_expires_at)
        : null;
      if (expiresAt && expiresAt >= new Date()) {
        await sendVerificationOtp(anonClient, email, emailRedirectTo);
        await adminClient
          .from("approval_requests")
          .update({
            submitted_email: email,
            email_verification_expires_at: emailVerificationExpiresAt(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", awaiting.id);

        return new Response(JSON.stringify({
          status: "otp_resent",
          message: EMAIL_RESENT_MESSAGE,
          request_id: awaiting.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
