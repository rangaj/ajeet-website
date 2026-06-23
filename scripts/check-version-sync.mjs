#!/usr/bin/env node
/**
 * Ensures package.json and supabase/VERSION.json stay aligned.
 * Run in CI on every push/PR; run locally before tagging a release.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const backend = JSON.parse(readFileSync(join(root, "supabase/VERSION.json"), "utf8"));

const errors = [];

if (!pkg.version) {
  errors.push("package.json is missing version");
}

if (!backend.version) {
  errors.push("supabase/VERSION.json is missing version");
}

if (pkg.version && backend.version && pkg.version !== backend.version) {
  errors.push(
    `version mismatch: package.json=${pkg.version}, supabase/VERSION.json=${backend.version}`
  );
}

if (errors.length > 0) {
  console.error("Version check failed:\n");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`Version OK: ${pkg.version} (FE + BE in sync)`);
