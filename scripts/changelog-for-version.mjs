#!/usr/bin/env node
/**
 * Prints the CHANGELOG section for a release version.
 * Usage: node scripts/changelog-for-version.mjs 1.0.0-beta.1
 *    or: node scripts/changelog-for-version.mjs v1.0.0-beta.1
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raw = process.argv[2];
if (!raw) {
  console.error("Usage: changelog-for-version.mjs <version>");
  process.exit(1);
}

const version = raw.replace(/^v/, "");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = readFileSync(join(root, "CHANGELOG.md"), "utf8");

const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = new RegExp(`## \\[${escaped}\\][\\s\\S]*?(?=\\n## \\[|$)`);
const match = content.match(pattern);

if (!match) {
  console.error(`No CHANGELOG.md section found for [${version}]`);
  process.exit(1);
}

process.stdout.write(match[0].trim());
