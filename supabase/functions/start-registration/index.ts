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

    const { data: existing } = await adminClient
      .from("alumni_members")
      .select("id, status, user_id, name, email, course, course_end_year")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (existing) {
      if (existing.status === "imported_unclaimed" || !existing.user_id) {
        return new Response(JSON.stringify({
          error: "use_claim_flow",
          message: "Roll number exists. Please use profile claim instead.",
        }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: conflictReq, error: conflictError } = await adminClient
        .from("approval_requests")
        .insert({
          type: "conflict",
          status: "pending_review",
          roll_number: rollNumber,
          submitted_email: email,
          submitted_name: payload.name ?? null,
          submitted_phone: payload.mobile_phone ?? null,
          submitted_dob: payload.date_of_birth ?? null,
          alumni_member_id: existing.id,
          user_id: user?.id ?? null,
          submitted_payload: payload,
        })
        .select()
        .single();

      if (conflictError) throw conflictError;

      return new Response(JSON.stringify({
        status: "conflict_review",
        message: "Roll number already exists. Routed to admin conflict review.",
        request_id: conflictReq.id,
        possible_match: existing,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
