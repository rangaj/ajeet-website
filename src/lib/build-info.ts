const BUILD_ID_PLACEHOLDER = "__BUILD_ID__";

declare global {
  interface Window {
    __BUILD_ID__?: string;
  }
}

/** Read build stamp from index.html (replaced by vite at build time). */
export function getBuildId(): string {
  if (typeof window !== "undefined") {
    const fromWindow = window.__BUILD_ID__?.trim();
    if (fromWindow && fromWindow !== BUILD_ID_PLACEHOLDER) {
      return fromWindow;
    }
  }

  if (typeof document !== "undefined") {
    const fromMeta = document
      .querySelector('meta[name="app-build"]')
      ?.getAttribute("content")
      ?.trim();
    if (fromMeta && fromMeta !== BUILD_ID_PLACEHOLDER) {
      return fromMeta;
    }
  }

  return import.meta.env.PROD ? "unknown" : "dev";
}
