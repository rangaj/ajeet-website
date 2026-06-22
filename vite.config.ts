import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
