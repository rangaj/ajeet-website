const DEFAULT_SITE_URL = "https://new.ajeets.org";

/** Public site origin for share links and other canonical URLs (not the current browser host). */
export function appSiteUrl(): string {
  const configured = import.meta.env.VITE_APP_SITE_URL?.trim();
  return (configured || DEFAULT_SITE_URL).replace(/\/$/, "");
}

export function shareCardUrl(token: string): string {
  return `${appSiteUrl()}/card/${token}`;
}

export function appSiteHostname(): string {
  try {
    return new URL(appSiteUrl()).hostname;
  } catch {
    return "new.ajeets.org";
  }
}
