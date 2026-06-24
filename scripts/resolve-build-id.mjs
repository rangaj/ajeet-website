import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readGitShortShaFromFiles() {
  try {
    const headPath = path.join(root, ".git", "HEAD");
    if (!fs.existsSync(headPath)) return null;
    const head = fs.readFileSync(headPath, "utf8").trim();
    let sha = head;
    if (head.startsWith("ref:")) {
      const refPath = path.join(root, ".git", head.slice(5).trim());
      sha = fs.readFileSync(refPath, "utf8").trim();
    }
    return sha.slice(0, 7);
  } catch {
    return null;
  }
}

function datedFallback() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `r${y}${mo}${da}${hh}${mm}`;
}

/** Resolve build stamp for footer + deploy verification. */
export function resolveBuildId() {
  const fromEnv = process.env.VITE_BUILD_ID?.trim();
  if (fromEnv && fromEnv !== "unknown") return fromEnv;

  const githubSha = process.env.GITHUB_SHA?.trim();
  if (githubSha) return githubSha.slice(0, 7);

  const fromFiles = readGitShortShaFromFiles();
  if (fromFiles) return fromFiles;

  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return datedFallback();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(resolveBuildId());
}
