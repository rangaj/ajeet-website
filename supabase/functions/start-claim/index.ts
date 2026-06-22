import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

async function notifyAdminClaim(details: {
  roll_number: string;
  name: string;
  email: string;
  verification: string;
  request_id?: string;
}) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "ssbjajeets@gmail.com";
  if (!resendKey) return;

  const from = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "alumni@example.com";
  const requestLine = details.request_id ? `\nRequest ID: ${details.request_id}` : "";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: adminEmail,
      subject: `New Ajeet ID claim — Roll ${details.roll_number}`,
      text:
        `A new Ajeet ID claim was submitted.\n\nRoll: ${details.roll_number}\nName: ${details.name}\nSubmitted email: ${details.email}\nVerification: ${details.verification}${requestLine}\n\nReview in the admin queue.`,
    }),
  });
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
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rollNumber = normalizeRoll(body.roll_number ?? "");
    const email = normalizeEmail(body.email ?? "");

    if (!rollNumber || !email) {
      return new Response(JSON.stringify({ error: "roll_number and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("alumni_members")
      .select("*")
      .eq("roll_number", rollNumber)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return new Response(JSON.stringify({
        error: "not_found",
        message: "Roll number not found. Use new registration instead.",
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (member.status !== "imported_unclaimed" && member.user_id) {
      return new Response(JSON.stringify({
        error: "already_claimed",
        message: "This profile has already been claimed. Try logging in or contact admin.",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailMatch = member.email && normalizeEmail(member.email) === email;
    const phoneMatch = body.phone && member.mobile_phone &&
      member.mobile_phone.replace(/\D/g, "") === String(body.phone).replace(/\D/g, "");
    const dobMatch = body.date_of_birth && member.date_of_birth === body.date_of_birth;
    const verification = emailMatch || phoneMatch || dobMatch ? "auto_matched" : "admin_review";

    if (verification === "auto_matched") {
      const { error: otpError } = await userClient.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (otpError) throw otpError;
    }

    const { data: request, error: reqError } = await adminClient
      .from("approval_requests")
      .insert({
        type: "claim",
        status: "pending_review",
        roll_number: rollNumber,
        submitted_email: email,
        submitted_name: member.name,
        submitted_phone: body.phone ?? null,
        submitted_dob: body.date_of_birth ?? null,
        alumni_member_id: member.id,
        user_id: user.id,
        submitted_payload: verification === "auto_matched"
          ? { verification: "auto_matched" }
          : {
              verification: "admin_review",
              imported_email: member.email,
            },
      })
      .select()
      .single();

    if (reqError) throw reqError;

    await adminClient.from("admin_audit_log").insert({
      actor_id: user.id,
      action: verification === "auto_matched" ? "claim_auto_matched" : "claim_admin_review",
      entity_type: "approval_requests",
      entity_id: request.id,
      details: { roll_number: rollNumber, verification },
    });

    await notifyAdminClaim({
      roll_number: rollNumber,
      name: member.name,
      email,
      verification,
      request_id: request.id,
    }).catch(() => {});

    if (verification === "auto_matched") {
      return new Response(JSON.stringify({
        status: "otp_sent",
        message: "Verification email sent. Complete OTP to continue claim.",
        auto_matched: true,
        request_id: request.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      status: "admin_review",
      message: "Email does not match our records. An admin will review your claim.",
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
