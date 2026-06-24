const BUILD_ID_PLACEHOLDER = "__BUILD_ID__";
const INVALID_BUILD_IDS = new Set([BUILD_ID_PLACEHOLDER, "unknown", ""]);

declare global {
  interface Window {
    __BUILD_ID__?: string;
  }
}

function isValidBuildId(value: string | undefined | null): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed) && !INVALID_BUILD_IDS.has(trimmed);
}

/** Read build stamp from index.html (replaced by vite at build time). */
export function getBuildId(): string {
  if (typeof window !== "undefined") {
    const fromWindow = window.__BUILD_ID__?.trim();
    if (isValidBuildId(fromWindow)) {
      return fromWindow;
    }
  }

  if (typeof document !== "undefined") {
    const fromMeta = document
      .querySelector('meta[name="app-build"]')
      ?.getAttribute("content")
      ?.trim();
    if (isValidBuildId(fromMeta)) {
      return fromMeta;
    }
  }

  return import.meta.env.PROD ? "live" : "dev";
}
