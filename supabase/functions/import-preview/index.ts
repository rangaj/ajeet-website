import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { normalizeSchoolCourseYears } from "../_shared/normalize-course-years.ts";

const MAX_ROLL_NUMBER = 7001;

const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  "Roll no": "roll_number",
  Name: "name",
  Salutation: "salutation",
  Gender: "gender",
  "Date of Birth": "date_of_birth",
  Label: "label",
  email_id: "email",
  Registered: "registered",
  "Registered On": "registered_at",
  "Approved On": "approved_at",
  "Profile Updated On": "profile_updated_at",
  "Admin Note": "admin_note",
  "Profile Type": "profile_type",
  Course: "course",
  Stream: "stream",
  "Course Start Year": "course_start_year",
  "Course End Year": "course_end_year",
  "Secondary Email": "secondary_email",
  "Mobile Phone No.": "mobile_phone",
  "Home Phone No.": "home_phone",
  "Office Phone No.": "office_phone",
  "Current Location": "current_location",
  "Home Town": "home_town",
  "Correspondence Address": "correspondence_address",
  "Correspondence City": "correspondence_city",
  "Correspondence State": "correspondence_state",
  "Correspondence Country": "correspondence_country",
  "Correspondence Pincode": "correspondence_pincode",
  Company: "company",
  Position: "job_position",
  "Premium Membership": "premium_membership",
  "Premium Number": "premium_number",
  "Member Roles": "member_roles",
  "Educational Course": "educational_course",
  "Educational Institute": "educational_institute",
  "Start Year": "edu_start_year",
  "End Year": "edu_end_year",
  "Facebook Link": "facebook_link",
  "LinkedIn Link": "linkedin_link",
  "Twitter Link": "twitter_link",
  "Website Link": "website_link",
  "Work Experience(in years)": "work_experience_years",
  "Professional Skills": "professional_skills",
  "Industries Worked In": "industries_worked_in",
  "Roles Played": "roles_played",
  HOUSE: "house",
};

type SkipReason = { code: string; detail: string };

type StagedRow = {
  source_line: number;
  raw: Record<string, string>;
  mapped: Record<string, unknown>;
  filled_count: number;
  reasons: SkipReason[];
  row_status: "valid" | "invalid" | "duplicate";
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((h) =>
    h.replace(/^\uFEFF/, "").replace(/^"|"$/g, "")
  );
  const rows = lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line).map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"'));
    const row: Record<string, string> = { __source_line: String(idx + 2) };
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

function filledFieldCount(row: Record<string, string>) {
  return Object.entries(row).filter(
    ([key, val]) => key !== "__source_line" && (val ?? "").trim() !== "" && val.trim() !== " "
  ).length;
}

function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  let phone = String(value).trim();
  if (!phone) return null;
  phone = phone.replace(/^#\s*/, "").trim();
  return phone || null;
}

function skip(code: string, detail: string): SkipReason {
  return { code, detail };
}

function evaluateExclusionRules(
  raw: Record<string, string>,
  mapped: Record<string, unknown>
): SkipReason[] {
  const rollRaw = String(mapped.roll_number ?? raw["Roll no"] ?? "").trim();
  const registered = String(mapped.registered ?? raw.Registered ?? "").trim();
  const name = String(mapped.name ?? raw.Name ?? "").trim();
  const email = String(mapped.email ?? raw.email_id ?? "").trim();

  if (!rollRaw) {
    return [skip("ROLL_MISSING", "No roll number in source row.")];
  }
  if (!/^\d+$/.test(rollRaw)) {
    return [skip("ROLL_NON_NUMERIC", `Roll number "${rollRaw}" is not numeric.`)];
  }

  const rollNum = parseInt(rollRaw, 10);
  if (rollNum === 0) {
    return [skip("ROLL_ZERO_STAFF", "Roll number is zero (staff / non-alumni record).")];
  }
  if (rollNum > MAX_ROLL_NUMBER) {
    return [
      skip(
        "ROLL_ABOVE_MAX",
        `Roll number ${rollNum} exceeds maximum allowed (${MAX_ROLL_NUMBER}).`
      ),
    ];
  }

  if (registered === "Blocked") {
    return [skip("REGISTERED_BLOCKED", "Member marked Registered=Blocked in source export.")];
  }
  if (registered === "No") {
    return [skip("REGISTERED_NO", "Member marked Registered=No in source export.")];
  }

  if (!name) {
    return [skip("MISSING_NAME", "Name is required.")];
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return [skip("INVALID_EMAIL", `Invalid email: ${email}`)];
  }

  const startRaw = mapped.course_start_year;
  const endRaw = mapped.course_end_year;
  if (startRaw !== undefined && endRaw !== undefined) {
    const start = Number(startRaw);
    const end = Number(endRaw);
    if (!Number.isNaN(start) && !Number.isNaN(end) && start > 0 && end > 0 && start > end) {
      return [skip("INVALID_COURSE_YEARS", "Course start year is after course end year.")];
    }
  }

  return [];
}

function normalizeRollForStorage(rollRaw: string) {
  return String(parseInt(rollRaw, 10));
}

function stageCsvRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): StagedRow[] {
  const eligible: StagedRow[] = [];
  const excluded: StagedRow[] = [];

  for (const raw of rows) {
    const sourceLine = Number(raw.__source_line ?? 0);
    const mapped = mapRow(raw, mapping);
    normalizeSchoolCourseYears(mapped);
    const rollRaw = String(mapped.roll_number ?? raw["Roll no"] ?? "").trim();
    if (rollRaw && /^\d+$/.test(rollRaw)) {
      mapped.roll_number = normalizeRollForStorage(rollRaw);
    }

    const reasons = evaluateExclusionRules(raw, mapped);
    const staged: StagedRow = {
      source_line: sourceLine,
      raw,
      mapped,
      filled_count: filledFieldCount(raw),
      reasons,
      row_status: reasons.length > 0 ? "invalid" : "valid",
    };

    if (reasons.length > 0) excluded.push(staged);
    else eligible.push(staged);
  }

  const byRoll = new Map<string, StagedRow[]>();
  for (const row of eligible) {
    const roll = String(row.mapped.roll_number);
    const group = byRoll.get(roll) ?? [];
    group.push(row);
    byRoll.set(roll, group);
  }

  const winners: StagedRow[] = [];
  const duplicateLosers: StagedRow[] = [];

  for (const [roll, group] of byRoll.entries()) {
    if (group.length === 1) {
      winners.push(group[0]);
      continue;
    }

    const sorted = [...group].sort((a, b) => {
      if (b.filled_count !== a.filled_count) return b.filled_count - a.filled_count;
      return a.source_line - b.source_line;
    });
    const winner = sorted[0];
    winners.push(winner);

    for (const loser of sorted.slice(1)) {
      duplicateLosers.push({
        ...loser,
        row_status: "duplicate",
        reasons: [
          skip(
            "DUPLICATE_SUPERSEDED",
            `Roll ${roll}: kept line ${winner.source_line} (${winner.filled_count} fields); this row had ${loser.filled_count} fields.`
          ),
        ],
      });
    }
  }

  return [...excluded, ...duplicateLosers, ...winners].sort(
    (a, b) => a.source_line - b.source_line
  );
}

function toDbInsert(
  mapped: Record<string, unknown>,
  batchId: string
): Record<string, unknown> {
  return {
    roll_number: String(mapped.roll_number ?? "").trim(),
    name: String(mapped.name ?? "Unknown"),
    salutation: mapped.salutation ?? null,
    gender: mapped.gender ?? null,
    date_of_birth: mapped.date_of_birth || null,
    email: mapped.email ?? null,
    course: mapped.course ?? null,
    stream: mapped.stream ?? null,
    course_start_year: mapped.course_start_year ? Number(mapped.course_start_year) : null,
    course_end_year: mapped.course_end_year ? Number(mapped.course_end_year) : null,
    secondary_email: mapped.secondary_email ?? null,
    mobile_phone: normalizePhone(mapped.mobile_phone),
    home_phone: normalizePhone(mapped.home_phone),
    office_phone: normalizePhone(mapped.office_phone),
    current_location: mapped.current_location ?? null,
    home_town: mapped.home_town ?? null,
    correspondence_address: mapped.correspondence_address ?? null,
    correspondence_city: mapped.correspondence_city ?? null,
    correspondence_state: mapped.correspondence_state ?? null,
    correspondence_country: mapped.correspondence_country ?? null,
    correspondence_pincode: mapped.correspondence_pincode ?? null,
    company: mapped.company ?? null,
    job_position: mapped.job_position ?? null,
    premium_membership: mapped.premium_membership ?? null,
    premium_number: mapped.premium_number ?? null,
    member_roles: mapped.member_roles ?? null,
    educational_course: mapped.educational_course ?? null,
    educational_institute: mapped.educational_institute ?? null,
    edu_start_year: mapped.edu_start_year ? Number(mapped.edu_start_year) : null,
    edu_end_year: mapped.edu_end_year ? Number(mapped.edu_end_year) : null,
    facebook_link: mapped.facebook_link ?? null,
    linkedin_link: mapped.linkedin_link ?? null,
    twitter_link: mapped.twitter_link ?? null,
    website_link: mapped.website_link ?? null,
    work_experience_years: mapped.work_experience_years
      ? Number(mapped.work_experience_years)
      : null,
    professional_skills: mapped.professional_skills ?? null,
    industries_worked_in: mapped.industries_worked_in ?? null,
    roles_played: mapped.roles_played ?? null,
    house: mapped.house ?? null,
    admin_note: mapped.admin_note ?? null,
    profile_type: mapped.profile_type ?? null,
    profile_updated_at: mapped.profile_updated_at || null,
    registered: mapped.registered === "Yes" ? true : mapped.registered === "No" ? false : null,
    registered_at: mapped.registered_at || null,
    approved_at: mapped.approved_at || null,
    status: "imported_unclaimed",
    import_batch_id: batchId,
  };
}

function summarizeReasons(rows: StagedRow[]) {
  const breakdown: Record<string, number> = {};
  for (const row of rows) {
    if (row.row_status === "valid") continue;
    const code = row.reasons[0]?.code ?? "UNKNOWN";
    breakdown[code] = (breakdown[code] ?? 0) + 1;
  }
  return breakdown;
}

function buildNotImportedCsv(rows: Array<{
  source_line: number;
  raw: Record<string, string>;
  reasons: SkipReason[];
  row_status: string;
}>, headers: string[]) {
  const metaHeaders = ["source_line", "row_status", "skip_reason", "skip_reason_detail"];
  const csvHeaders = [...headers, ...metaHeaders];
  const lines = [csvHeaders.map(escapeCsv).join(",")];

  for (const row of rows) {
    const reason = row.reasons[0];
    const values = [
      ...headers.map((h) => row.raw[h] ?? ""),
      String(row.source_line),
      row.row_status,
      reason?.code ?? "",
      reason?.detail ?? "",
    ];
    lines.push(values.map(escapeCsv).join(","));
  }

  return lines.join("\n");
}

function escapeCsv(value: string) {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGING_CHUNK = 500;
const ROLL_LOOKUP_CHUNK = 500;

async function requireAdmin(req: Request) {
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
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders }) };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders }) };
  }

  return { adminClient, user };
}

function markDbDuplicates(staged: StagedRow[], existingRolls: Set<string>) {
  for (const row of staged) {
    if (row.row_status !== "valid") continue;
    const roll = String(row.mapped.roll_number ?? "");
    if (existingRolls.has(roll)) {
      row.row_status = "invalid";
      row.reasons = [
        {
          code: "ALREADY_IN_DATABASE",
          detail: `Roll number ${roll} already exists in alumni_members.`,
        },
      ];
    }
  }
}

async function loadExistingRolls(adminClient: ReturnType<typeof createClient>, rolls: string[]) {
  const existing = new Set<string>();
  for (let i = 0; i < rolls.length; i += ROLL_LOOKUP_CHUNK) {
    const chunk = rolls.slice(i, i + ROLL_LOOKUP_CHUNK);
    const { data } = await adminClient
      .from("alumni_members")
      .select("roll_number")
      .in("roll_number", chunk);
    for (const row of data ?? []) {
      existing.add(String(row.roll_number));
    }
  }
  return existing;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    const { adminClient, user } = auth;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "file is required" }), { status: 400, headers: corsHeaders });
    }

    const { data: mappingRow } = await adminClient
      .from("import_field_mappings")
      .select("mapping")
      .eq("is_default", true)
      .maybeSingle();

    const mapping = {
      ...DEFAULT_FIELD_MAPPING,
      ...((mappingRow?.mapping ?? {}) as Record<string, string>),
    };

    const csvText = await file.text();
    const { headers, rows } = parseCsv(csvText);
    const staged = stageCsvRows(rows, mapping);

    const winnerRolls = staged
      .filter((r) => r.row_status === "valid")
      .map((r) => String(r.mapped.roll_number));
    const existingRolls = await loadExistingRolls(adminClient, winnerRolls);
    markDbDuplicates(staged, existingRolls);

    const valid = staged.filter((r) => r.row_status === "valid").length;
    const invalid = staged.filter((r) => r.row_status === "invalid").length;
    const duplicates = staged.filter((r) => r.row_status === "duplicate").length;
    const reasonBreakdown = summarizeReasons(staged);

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

    const stagingPayload = staged.map((row) => ({
      import_batch_id: batch.id,
      row_number: row.source_line,
      raw_payload: {
        source_line: row.source_line,
        raw: row.raw,
        mapped: row.mapped,
      },
      validation_errors: row.reasons as SkipReason[],
      row_status: row.row_status,
    }));

    for (let i = 0; i < stagingPayload.length; i += STAGING_CHUNK) {
      const chunk = stagingPayload.slice(i, i + STAGING_CHUNK);
      const { error: insertError } = await adminClient.from("imported_records").insert(chunk);
      if (insertError) throw insertError;
    }

    const notImported = staged.filter((r) => r.row_status !== "valid");
    const notImportedCsv = buildNotImportedCsv(notImported, headers);

    const preview = staged.slice(0, 50).map((row) => ({
      source_line: row.source_line,
      roll_number: row.mapped.roll_number ?? "",
      name: row.mapped.name ?? "",
      row_status: row.row_status,
      skip_reason: row.reasons[0]?.code ?? "",
      skip_reason_detail: row.reasons[0]?.detail ?? "",
    }));

    return new Response(JSON.stringify({
      batch_id: batch.id,
      summary: {
        total: rows.length,
        will_import: valid,
        not_imported: invalid + duplicates,
        invalid,
        duplicates,
        headers,
        reason_breakdown: reasonBreakdown,
      },
      preview,
      not_imported_csv: notImportedCsv,
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
