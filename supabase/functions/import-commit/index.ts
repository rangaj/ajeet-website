import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 500;

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { batch_id } = await req.json();
    if (!batch_id) {
      return new Response(JSON.stringify({ error: "batch_id is required" }), { status: 400, headers: corsHeaders });
    }

    const { data: batch } = await adminClient
      .from("import_batches")
      .select("*")
      .eq("id", batch_id)
      .single();

    if (!batch) {
      return new Response(JSON.stringify({ error: "Batch not found" }), { status: 404, headers: corsHeaders });
    }

    if (batch.committed_at) {
      return new Response(JSON.stringify({ error: "Batch already committed" }), { status: 409, headers: corsHeaders });
    }

    const { data: validRows, error: rowsError } = await adminClient
      .from("imported_records")
      .select("*")
      .eq("import_batch_id", batch_id)
      .eq("row_status", "valid");

    if (rowsError) throw rowsError;

    let imported = 0;
    const chunks: typeof validRows[] = [];
    for (let i = 0; i < (validRows?.length ?? 0); i += BATCH_SIZE) {
      chunks.push(validRows!.slice(i, i + BATCH_SIZE));
    }

    for (const chunk of chunks) {
      const inserts = chunk.map((r) => {
        const p = r.raw_payload as Record<string, unknown>;
        return {
          roll_number: String(p.roll_number ?? "").trim(),
          name: String(p.name ?? "Unknown"),
          salutation: p.salutation ?? null,
          gender: p.gender ?? null,
          date_of_birth: p.date_of_birth || null,
          email: p.email ?? null,
          course: p.course ?? null,
          stream: p.stream ?? null,
          course_start_year: p.course_start_year ? Number(p.course_start_year) : null,
          course_end_year: p.course_end_year ? Number(p.course_end_year) : null,
          secondary_email: p.secondary_email ?? null,
          mobile_phone: p.mobile_phone ?? null,
          home_phone: p.home_phone ?? null,
          office_phone: p.office_phone ?? null,
          current_location: p.current_location ?? null,
          home_town: p.home_town ?? null,
          correspondence_address: p.correspondence_address ?? null,
          correspondence_city: p.correspondence_city ?? null,
          correspondence_state: p.correspondence_state ?? null,
          correspondence_country: p.correspondence_country ?? null,
          correspondence_pincode: p.correspondence_pincode ?? null,
          company: p.company ?? null,
          job_position: p.job_position ?? null,
          premium_membership: p.premium_membership ?? null,
          premium_number: p.premium_number ?? null,
          member_roles: p.member_roles ?? null,
          educational_course: p.educational_course ?? null,
          educational_institute: p.educational_institute ?? null,
          edu_start_year: p.edu_start_year ? Number(p.edu_start_year) : null,
          edu_end_year: p.edu_end_year ? Number(p.edu_end_year) : null,
          facebook_link: p.facebook_link ?? null,
          linkedin_link: p.linkedin_link ?? null,
          twitter_link: p.twitter_link ?? null,
          website_link: p.website_link ?? null,
          work_experience_years: p.work_experience_years ? Number(p.work_experience_years) : null,
          professional_skills: p.professional_skills ?? null,
          industries_worked_in: p.industries_worked_in ?? null,
          roles_played: p.roles_played ?? null,
          house: p.house ?? null,
          admin_note: p.admin_note ?? null,
          profile_type: p.profile_type ?? null,
          status: "imported_unclaimed",
          import_batch_id: batch_id,
        };
      });

      const { error: insertError } = await adminClient
        .from("alumni_members")
        .upsert(inserts, { onConflict: "roll_number", ignoreDuplicates: true });

      if (insertError) throw insertError;
      imported += inserts.length;

      await adminClient
        .from("imported_records")
        .update({ row_status: "imported" })
        .in("id", chunk.map((c) => c.id));
    }

    await adminClient
      .from("import_batches")
      .update({ committed_at: new Date().toISOString() })
      .eq("id", batch_id);

    await adminClient.from("admin_audit_log").insert({
      actor_id: user.id,
      action: "import_commit",
      entity_type: "import_batches",
      entity_id: batch_id,
      details: { imported },
    });

    return new Response(JSON.stringify({
      batch_id,
      imported,
      message: `Successfully imported ${imported} alumni records.`,
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
