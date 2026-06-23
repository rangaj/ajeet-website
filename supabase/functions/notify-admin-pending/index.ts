import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function notifyAdminReady(details: {
  roll_number: string;
  name: string;
  email: string;
  type: string;
  request_id: string;
}) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "ssbjajeets@gmail.com";
  if (!resendKey) return;

  const from = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "alumni@example.com";
  const label = details.type.replace(/_/g, " ");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: adminEmail,
      subject: `Ready for review — Roll ${details.roll_number}`,
      text:
        `An alumni ${label} is ready for admin review (email link verified).\n\n` +
        `Roll: ${details.roll_number}\nName: ${details.name}\nEmail: ${details.email}\n` +
        `Request ID: ${details.request_id}\n\nReview in the admin queue.`,
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
    const { request_id } = body as { request_id?: string };
    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: request } = await adminClient
      .from("approval_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (!request || request.status !== "pending_review") {
      return new Response(JSON.stringify({ error: "Request not ready for admin notification" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await notifyAdminReady({
      roll_number: request.roll_number,
      name: request.submitted_name ?? "Alumni",
      email: request.submitted_email,
      type: request.type,
      request_id: request.id,
    });

    return new Response(JSON.stringify({ ok: true }), {
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
