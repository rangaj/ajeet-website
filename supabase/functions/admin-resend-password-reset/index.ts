import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logMemberEmailEvent } from "../_shared/member-email-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    if (!memberId) {
      return new Response(JSON.stringify({ error: "member_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("alumni_members")
      .select("id, email, user_id, roll_number")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let recipient = member.email;
    if (member.user_id) {
      const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(
        member.user_id
      );
      if (authError) throw authError;
      recipient = authUser.user?.email ?? member.email;
    }

    if (!recipient) {
      return new Response(JSON.stringify({ error: "No email address on file for this member" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectTo = `${appSiteUrl()}/reset-password`;
    const { error: resetError } = await anonClient.auth.resetPasswordForEmail(recipient, {
      redirectTo,
    });

    await logMemberEmailEvent(adminClient, {
      alumniMemberId: memberId,
      emailType: "password_reset",
      provider: "auth_service",
      recipient,
      status: resetError ? "failed" : "sent_to_auth_service",
      errorMessage: resetError?.message ?? null,
      triggerSource: adminCheck.user.id,
    });

    if (resetError) {
      return new Response(JSON.stringify({ error: "Unable to send email", detail: resetError.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("admin_audit_log").insert({
      actor_id: adminCheck.user.id,
      action: "password_reset_resent",
      entity_type: "alumni_member",
      entity_id: memberId,
      details: { roll_number: member.roll_number, recipient },
    });

    return new Response(JSON.stringify({
      ok: true,
      message: "Password reset email triggered.",
      recipient,
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
