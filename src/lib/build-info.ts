import { useEffect, useState } from "react";

const BUILD_ID_PLACEHOLDER = "__BUILD_ID__";
const INVALID_BUILD_IDS = new Set([BUILD_ID_PLACEHOLDER, "unknown", ""]);

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
  if (!trimmed) return false;
  return !INVALID_BUILD_IDS.has(trimmed);
}

function compileTimeBuildId(): string | null {
  if (typeof __BUILD_SHA__ === "string" && isValidBuildId(__BUILD_SHA__)) {
    return __BUILD_SHA__;
  }
  return null;
}

/** Read build stamp from bundle, index.html, or /build-id.txt. */
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

/** Footer label — fetches /build-id.txt if compile-time and HTML stamps are missing. */
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
