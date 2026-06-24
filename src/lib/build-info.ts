/** Read from <meta name="app-build"> injected at build time in vite.config.ts. */
function resolveBuildId(): string {
  if (typeof document !== "undefined") {
    const fromMeta = document
      .querySelector('meta[name="app-build"]')
      ?.getAttribute("content")
      ?.trim();
    if (fromMeta) return fromMeta;
  }
  return import.meta.env.PROD ? "unknown" : "dev";
}

export const BUILD_ID = resolveBuildId();
