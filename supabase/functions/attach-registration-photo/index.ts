import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const profilePhotoPath = String(body.profile_photo_path ?? "").trim();
    if (!profilePhotoPath) {
      return new Response(JSON.stringify({ error: "profile_photo_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: request, error: fetchError } = await userClient
      .from("approval_requests")
      .select("id, submitted_payload")
      .eq("user_id", user.id)
      .eq("type", "new_registration")
      .in("status", ["pending_review", "more_info_required"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return new Response(JSON.stringify({ error: "No pending registration found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (request.submitted_payload ?? {}) as Record<string, unknown>;
    const { error: updateError } = await userClient
      .from("approval_requests")
      .update({
        submitted_payload: { ...payload, profile_photo_path: profilePhotoPath },
      })
      .eq("id", request.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, request_id: request.id }), {
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
