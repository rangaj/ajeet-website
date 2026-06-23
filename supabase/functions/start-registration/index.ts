import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeRoll(roll: string) {
  const trimmed = roll.trim();
  if (!/^\d+$/.test(trimmed)) return "";
  return String(parseInt(trimmed, 10));
}

const PENDING_STATUSES = ["pending_review", "more_info_required"] as const;

async function findPendingByRoll(
  adminClient: ReturnType<typeof createClient>,
  rollNumber: string
) {
  const { data } = await adminClient
    .from("approval_requests")
    .select("id, created_at, type, status")
    .eq("roll_number", rollNumber)
    .in("status", [...PENDING_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

function pendingResponse(rollNumber: string, pending: { id: string; created_at: string; type: string }) {
  const label = pending.type.replace(/_/g, " ");
  return new Response(
    JSON.stringify({
      error: "already_pending",
      status: "already_pending",
      message:
        `A ${label} request for roll ${rollNumber} is already in the approval queue. ` +
        "Please wait for admin review or check your email — do not register again.",
      request_id: pending.id,
      submitted_at: pending.created_at,
    }),
    {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function blockResponse(
  error: string,
  message: string,
  status = 409
) {
  return new Response(JSON.stringify({ error, status: error, message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function registrationBlockedForMember(member: {
  status: string;
  user_id: string | null;
}) {
  if (member.user_id || member.status === "approved") {
    return blockResponse(
      "already_registered",
      "This roll number is already linked to an account. Sign in instead of registering again."
    );
  }

  if (member.status === "imported_unclaimed") {
    return blockResponse(
      "use_claim_flow",
      "This roll number is already in our directory. Claim your Ajeet ID instead of registering."
    );
  }

  if (member.status === "pending_review") {
    return blockResponse(
      "already_pending",
      "This roll number already has a profile awaiting approval. Check your email or sign in — do not register again."
    );
  }

  return blockResponse(
    "roll_exists",
    "This roll number is already in our system. Sign in if you have an account, or use Claim your Ajeet ID."
  );
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
    const email = String(body.email ?? "").trim().toLowerCase();
    const payload = body.payload ?? {};
    const emailRedirectTo = body.email_redirect_to ?? undefined;

    if (!rollNumber || !email) {
      return new Response(JSON.stringify({ error: "roll_number and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pending = await findPendingByRoll(adminClient, rollNumber);
    if (pending) return pendingResponse(rollNumber, pending);

    const { data: existing } = await adminClient
      .from("alumni_members")
      .select("id, status, user_id, name, email, course, course_end_year")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (existing) {
      return registrationBlockedForMember(existing);
    }

    const { error: otpError } = await anonClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo,
      },
    });
    if (otpError) throw otpError;

    const { data: request, error: reqError } = await adminClient
      .from("approval_requests")
      .insert({
        type: "new_registration",
        status: "pending_review",
        roll_number: rollNumber,
        submitted_email: email,
        submitted_name: payload.name ?? null,
        submitted_phone: payload.mobile_phone ?? null,
        submitted_dob: payload.date_of_birth ?? null,
        user_id: user?.id ?? null,
        submitted_payload: payload,
      })
      .select()
      .single();

    if (reqError) throw reqError;

    return new Response(JSON.stringify({
      status: "pending_review",
      message: "Registration submitted. Check your email to verify, and then await approval.",
      request_id: request.id,
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
