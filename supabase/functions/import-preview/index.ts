import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line, idx) => {
    const values = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((v) =>
      v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
    ) ?? [];
    const row: Record<string, string> = { __row_number: String(idx + 2) };
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

function mapRow(row: Record<string, string>, mapping: Record<string, string>) {
  const mapped: Record<string, unknown> = {};
  for (const [source, target] of Object.entries(mapping)) {
    const val = row[source];
    if (val !== undefined && val !== "") mapped[target] = val;
  }
  return mapped;
}

function validateMapped(mapped: Record<string, unknown>) {
  const errors: string[] = [];
  if (!mapped.roll_number) errors.push("Missing roll number");
  if (!mapped.name) errors.push("Missing name");
  const email = String(mapped.email ?? "");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Invalid email");
  }
  const start = Number(mapped.course_start_year);
  const end = Number(mapped.course_end_year);
  if (mapped.course_start_year && mapped.course_end_year && start > end) {
    errors.push("Course start year after end year");
  }
  return errors;
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mappingId = formData.get("mapping_id") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "file is required" }), { status: 400, headers: corsHeaders });
    }

    const { data: mappingRow } = await adminClient
      .from("import_field_mappings")
      .select("mapping")
      .eq("is_default", true)
      .maybeSingle();

    const mapping = (mappingRow?.mapping ?? {}) as Record<string, string>;
    const csvText = await file.text();
    const { headers, rows } = parseCsv(csvText);

    const rollNumbers = new Set<string>();
    const previewRows: Array<Record<string, unknown>> = [];
    let valid = 0;
    let invalid = 0;
    let duplicates = 0;

    for (const row of rows) {
      const mapped = mapRow(row, mapping);
      const errors = validateMapped(mapped);
      const roll = String(mapped.roll_number ?? "").trim();

      if (rollNumbers.has(roll)) {
        duplicates++;
        previewRows.push({ ...mapped, __status: "duplicate", __errors: ["Duplicate in file"] });
        continue;
      }
      rollNumbers.add(roll);

      const { data: existing } = await adminClient
        .from("alumni_members")
        .select("id")
        .eq("roll_number", roll)
        .maybeSingle();

      if (existing) {
        duplicates++;
        previewRows.push({ ...mapped, __status: "duplicate", __errors: ["Roll number already in database"] });
        continue;
      }

      if (errors.length > 0) {
        invalid++;
        previewRows.push({ ...mapped, __status: "invalid", __errors: errors });
      } else {
        valid++;
        previewRows.push({ ...mapped, __status: "valid", __errors: [] });
      }
    }

    const { data: batch, error: batchError } = await adminClient
      .from("import_batches")
      .insert({
        uploaded_by: user.id,
        file_name: file.name,
        field_mapping: mapping,
        total_rows: rows.length,
        valid_rows: valid,
        invalid_rows: invalid,
        duplicate_rows: duplicates,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    const staging = previewRows.slice(0, 500).map((r, i) => ({
      import_batch_id: batch.id,
      row_number: i + 1,
      raw_payload: r,
      validation_errors: r.__errors,
      row_status: r.__status === "valid" ? "valid" : r.__status === "duplicate" ? "duplicate" : "invalid",
    }));

    if (staging.length > 0) {
      await adminClient.from("imported_records").insert(staging);
    }

    return new Response(JSON.stringify({
      batch_id: batch.id,
      summary: {
        total: rows.length,
        valid,
        invalid,
        duplicates,
        headers,
        mapping,
      },
      preview: previewRows.slice(0, 50),
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
