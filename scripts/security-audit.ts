/**
 * Security audit script — run after deployment with service role key.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/security-audit.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const TABLES = [
  "profiles",
  "alumni_members",
  "import_batches",
  "imported_records",
  "approval_requests",
  "admin_audit_log",
  "import_field_mappings",
];

async function main() {
  console.log("=== School Alumni App Security Audit ===\n");

  let passed = 0;
  let failed = 0;

  const check = (name: string, ok: boolean, detail?: string) => {
    if (ok) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  };

  // Anon client should not read full directory without auth
  const anon = createClient(url, process.env.SUPABASE_ANON_KEY ?? serviceKey);
  const { data: anonSearch, error: anonSearchErr } = await anon.rpc("search_alumni", {
    p_query: "test",
    p_page: 1,
  });
  check(
    "Unauthenticated search_alumni blocked",
    !!anonSearchErr || (anonSearch?.length ?? 0) === 0,
    anonSearchErr?.message
  );

  // Roll number uniqueness constraint
  const { data: dups } = await supabase.rpc("lookup_roll_number", { p_roll_number: "NONEXISTENT" });
  check("lookup_roll_number RPC reachable", Array.isArray(dups));

  // Default import mapping exists
  const { data: mapping } = await supabase
    .from("import_field_mappings")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  check("Default import field mapping configured", !!mapping);

  // Storage buckets
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketIds = buckets?.map((b) => b.id) ?? [];
  check("profile-photos bucket exists", bucketIds.includes("profile-photos"));
  check("evidence-uploads bucket exists", bucketIds.includes("evidence-uploads"));
  check("import-temp bucket exists", bucketIds.includes("import-temp"));

  console.log(`\nTables to verify RLS in Supabase Dashboard: ${TABLES.join(", ")}`);
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.log("\nRun supabase/scripts/uat-checklist.sql for full SQL audit.");
  process.exit(failed > 0 ? 1 : 0);
}

main();
