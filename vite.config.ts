import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "node:child_process";

function resolveBuildId() {
  if (process.env.VITE_BUILD_ID) return process.env.VITE_BUILD_ID;
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const buildId = resolveBuildId();
const BUILD_ID_PLACEHOLDER = "__BUILD_ID__";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "log-build-id",
      buildStart() {
        console.log(`[vite] APP_BUILD_ID=${buildId}`);
      },
    },
    {
      name: "html-build-id",
      transformIndexHtml(html) {
        return html.replaceAll(BUILD_ID_PLACEHOLDER, buildId);
      },
    },
    {
      name: "emit-build-id-txt",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "build-id.txt",
          source: buildId,
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    // Replit maps external port 80 → 5000 in .replit; use 5000 when running on Replit
    port: process.env.REPL_ID ? 5000 : 5173,
    strictPort: true,
    allowedHosts: [".replit.dev", ".repl.co", ".replit.app", "localhost"],
    hmr: process.env.REPL_ID
      ? {
          protocol: "wss",
          clientPort: 443,
        }
      : undefined,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5000,
    // Replit Autoscale may use vite preview; allow all hosts on published URLs
    allowedHosts: true,
  },
});
