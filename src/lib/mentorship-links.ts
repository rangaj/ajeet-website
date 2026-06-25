import {
  MENTOR_BOOKING_DOMAIN_LABELS,
  MENTOR_BOOKING_SUPPORTED_HOSTS,
} from "@/constants/mentor-booking-domains";

export const MENTORSHIP_BLURB_MAX_LENGTH = 500;
export const PAID_SESSION_LINK_MAX_COUNT = 3;

export type PaidSessionLink = {
  url: string;
};

function stripWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

export function mentorBookingHostname(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    const host = stripWww(parsed.hostname);
    const supported = MENTOR_BOOKING_SUPPORTED_HOSTS.some((h) => stripWww(h) === host);
    return supported ? host : null;
  } catch {
    return null;
  }
}

export function normalizeMentorBookingUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (!mentorBookingHostname(parsed.href)) return null;
    parsed.protocol = "https:";
    let normalized = parsed.href.replace(/\/$/, "");
    return normalized;
  } catch {
    return null;
  }
}

export function mentorBookingPlatformLabel(url: string): string {
  const host = mentorBookingHostname(url);
  if (!host) return "External booking";
  return MENTOR_BOOKING_DOMAIN_LABELS[host] ?? host;
}

export function parsePaidSessionLinks(value: unknown): PaidSessionLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
        return { url: item.url };
      }
      return null;
    })
    .filter((item): item is PaidSessionLink => item !== null);
}

export type PaidLinkValidationResult =
  | { ok: true; links: PaidSessionLink[] }
  | { ok: false; message: string };

export function validatePaidSessionLinks(urls: string[]): PaidLinkValidationResult {
  const nonEmpty = urls.map((u) => u.trim()).filter(Boolean);
  if (nonEmpty.length === 0) {
    return { ok: false, message: "Add at least one booking URL or turn off paid sessions." };
  }
  if (nonEmpty.length > PAID_SESSION_LINK_MAX_COUNT) {
    return { ok: false, message: `At most ${PAID_SESSION_LINK_MAX_COUNT} booking links are allowed.` };
  }

  const normalized: PaidSessionLink[] = [];
  const hosts = new Set<string>();

  for (const raw of nonEmpty) {
    const url = normalizeMentorBookingUrl(raw);
    if (!url) {
      return {
        ok: false,
        message: "Each URL must use HTTPS and a supported booking platform.",
      };
    }
    const host = mentorBookingHostname(url);
    if (!host || hosts.has(host)) {
      return { ok: false, message: "Duplicate booking platform links are not allowed." };
    }
    hosts.add(host);
    normalized.push({ url });
  }

  return { ok: true, links: normalized };
}
