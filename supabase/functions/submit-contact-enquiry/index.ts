import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = new Set([
  "general_enquiry",
  "profile_claim_issue",
  "registration_issue",
  "directory_correction",
  "technical_issue",
  "association_enquiry",
  "media_podcast_enquiry",
  "other",
]);

const CATEGORY_LABELS: Record<string, string> = {
  general_enquiry: "General Enquiry",
  profile_claim_issue: "Profile Claim Issue",
  registration_issue: "Registration Issue",
  directory_correction: "Directory Correction",
  technical_issue: "Technical Issue",
  association_enquiry: "Association Enquiry",
  media_podcast_enquiry: "Media & Podcast Enquiry",
  other: "Other",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendAdminEmail(details: {
  name: string;
  email: string;
  category: string;
  message: string;
  enquiry_id: string;
}) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_NOTIFY_EMAIL") ?? "admin@ajeets.org";
  if (!resendKey) return false;

  const from = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "alumni@example.com";
  const categoryLabel = CATEGORY_LABELS[details.category] ?? details.category;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: adminEmail,
      reply_to: details.email,
      subject: `Contact form — ${categoryLabel}`,
      text:
        `New contact enquiry from the Ajeet Alumni Platform.\n\n` +
        `Name: ${details.name}\nEmail: ${details.email}\nCategory: ${categoryLabel}\n` +
        `Enquiry ID: ${details.enquiry_id}\n\nMessage:\n${details.message}`,
    }),
  });

  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
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

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const category = String(body.category ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || name.length > 200) {
      return jsonResponse({ error: "invalid_name", message: "Please enter your name." }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "invalid_email", message: "Please enter a valid email address." }, 400);
    }
    if (!CATEGORIES.has(category)) {
      return jsonResponse({ error: "invalid_category", message: "Please select a category." }, 400);
    }
    if (!message || message.length < 10 || message.length > 5000) {
      return jsonResponse(
        { error: "invalid_message", message: "Please enter a message (at least 10 characters)." },
        400
      );
    }

    const { data: { user } } = await userClient.auth.getUser();

    const { data: row, error: insertError } = await adminClient
      .from("contact_enquiries")
      .insert({
        name,
        email,
        category,
        message,
        user_id: user?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError || !row) {
      return jsonResponse(
        { error: "insert_failed", message: "Could not save your enquiry. Please try again." },
        500
      );
    }

    const emailed = await sendAdminEmail({
      name,
      email,
      category,
      message,
      enquiry_id: row.id,
    });

    return jsonResponse({
      ok: true,
      enquiry_id: row.id,
      emailed,
      message:
        "Thank you for contacting us. We have received your message and will get back to you soon.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "server_error", message: msg }, 500);
  }
});
