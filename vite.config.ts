import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolveBuildId } from "./scripts/resolve-build-id.mjs";

const buildId = resolveBuildId();
const BUILD_ID_PLACEHOLDER = "__BUILD_ID__";
const rootDir = path.dirname(fileURLToPath(import.meta.url));

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
    {
      name: "verify-build-id",
      closeBundle() {
        const htmlPath = path.resolve(rootDir, "dist", "index.html");
        if (!fs.existsSync(htmlPath)) return;
        let html = fs.readFileSync(htmlPath, "utf8");
        if (!html.includes(BUILD_ID_PLACEHOLDER)) return;
        html = html.replaceAll(BUILD_ID_PLACEHOLDER, buildId);
        fs.writeFileSync(htmlPath, html);
        console.log(`[build] patched ${BUILD_ID_PLACEHOLDER} in dist/index.html → ${buildId}`);
      },
    },
  ],
  define: {
    __BUILD_SHA__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
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
