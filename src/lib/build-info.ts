import { useEffect, useState } from "react";

const BUILD_ID_PLACEHOLDER = "__BUILD_ID__";
const INVALID_BUILD_IDS = new Set([BUILD_ID_PLACEHOLDER, "unknown", "live", "dev", ""]);
/** Git short SHA or Replit dated fallback from resolve-build-id.mjs (e.g. r202606242230). */
const BUILD_ID_PATTERN = /^(?:[a-f0-9]{7,40}|r\d{12,})$/i;

declare global {
  interface Window {
    __BUILD_ID__?: string;
  }
}

/** Injected into the JS bundle at compile time via vite.config.ts `define`. */
declare const __BUILD_SHA__: string;

function isValidBuildId(value: string | undefined | null): value is string {
  if (value == null) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return false;
  if (INVALID_BUILD_IDS.has(trimmed)) return false;
  if (trimmed.includes("<") || trimmed.includes(">")) return false;
  return BUILD_ID_PATTERN.test(trimmed);
}

function compileTimeBuildId(): string | null {
  if (typeof __BUILD_SHA__ === "string" && isValidBuildId(__BUILD_SHA__)) {
    return __BUILD_SHA__;
  }
  return null;
}

/** Read build stamp from bundle or index.html. */
export function getBuildId(): string {
  const compiled = compileTimeBuildId();
  if (compiled) return compiled;

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

/** Footer label — optional fetch of /build-id.txt when stamps are missing. */
export function useBuildId(): string {
  const [buildId, setBuildId] = useState(getBuildId);

  useEffect(() => {
    const current = getBuildId();
    if (current !== "live" && current !== "dev") {
      setBuildId(current);
      return;
    }

    void fetch("/build-id.txt", { cache: "no-store" })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        const id = text.trim();
        if (isValidBuildId(id)) setBuildId(id);
      })
      .catch(() => {});
  }, []);

  return buildId;
}
