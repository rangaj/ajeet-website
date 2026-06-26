export type CountryDialCode = {
  iso: string;
  name: string;
  dial: string;
};

/** India first (most members), then a broad set of common diaspora countries, then the rest. */
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: "IN", name: "India", dial: "+91" },
  { iso: "US", name: "United States", dial: "+1" },
  { iso: "GB", name: "United Kingdom", dial: "+44" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso: "CA", name: "Canada", dial: "+1" },
  { iso: "AU", name: "Australia", dial: "+61" },
  { iso: "SG", name: "Singapore", dial: "+65" },
  { iso: "QA", name: "Qatar", dial: "+974" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso: "OM", name: "Oman", dial: "+968" },
  { iso: "KW", name: "Kuwait", dial: "+965" },
  { iso: "BH", name: "Bahrain", dial: "+973" },
  { iso: "DE", name: "Germany", dial: "+49" },
  { iso: "FR", name: "France", dial: "+33" },
  { iso: "NL", name: "Netherlands", dial: "+31" },
  { iso: "CH", name: "Switzerland", dial: "+41" },
  { iso: "IE", name: "Ireland", dial: "+353" },
  { iso: "NZ", name: "New Zealand", dial: "+64" },
  { iso: "JP", name: "Japan", dial: "+81" },
  { iso: "CN", name: "China", dial: "+86" },
  { iso: "HK", name: "Hong Kong", dial: "+852" },
  { iso: "MY", name: "Malaysia", dial: "+60" },
  { iso: "ID", name: "Indonesia", dial: "+62" },
  { iso: "TH", name: "Thailand", dial: "+66" },
  { iso: "PH", name: "Philippines", dial: "+63" },
  { iso: "NP", name: "Nepal", dial: "+977" },
  { iso: "LK", name: "Sri Lanka", dial: "+94" },
  { iso: "BD", name: "Bangladesh", dial: "+880" },
  { iso: "PK", name: "Pakistan", dial: "+92" },
  { iso: "ZA", name: "South Africa", dial: "+27" },
  { iso: "KE", name: "Kenya", dial: "+254" },
  { iso: "NG", name: "Nigeria", dial: "+234" },
  { iso: "SE", name: "Sweden", dial: "+46" },
  { iso: "NO", name: "Norway", dial: "+47" },
  { iso: "DK", name: "Denmark", dial: "+45" },
  { iso: "IT", name: "Italy", dial: "+39" },
  { iso: "ES", name: "Spain", dial: "+34" },
  { iso: "PT", name: "Portugal", dial: "+351" },
  { iso: "BE", name: "Belgium", dial: "+32" },
  { iso: "AT", name: "Austria", dial: "+43" },
  { iso: "PL", name: "Poland", dial: "+48" },
  { iso: "RU", name: "Russia", dial: "+7" },
  { iso: "BR", name: "Brazil", dial: "+55" },
  { iso: "MX", name: "Mexico", dial: "+52" },
];

export const DEFAULT_COUNTRY_ISO = "IN";

/** Dial codes longest-first so prefix matching is unambiguous (e.g. +971 before +9). */
const DIAL_CODES_BY_LENGTH = [...COUNTRY_DIAL_CODES].sort(
  (a, b) => b.dial.length - a.dial.length
);

export function findCountryByIso(iso: string): CountryDialCode | undefined {
  return COUNTRY_DIAL_CODES.find((c) => c.iso === iso);
}

/** Split a stored E.164 value into a country + national digits for editing. */
export function splitE164(value: string | null | undefined): {
  iso: string;
  national: string;
} {
  const trimmed = (value ?? "").trim();
  if (trimmed.startsWith("+")) {
    const match = DIAL_CODES_BY_LENGTH.find((c) => trimmed.startsWith(c.dial));
    if (match) {
      return { iso: match.iso, national: trimmed.slice(match.dial.length).replace(/\D/g, "") };
    }
  }
  return { iso: DEFAULT_COUNTRY_ISO, national: trimmed.replace(/\D/g, "") };
}

/** Build an E.164 string from a country ISO + national number, or "" if no number entered. */
export function toE164(iso: string, national: string): string {
  const digits = national.replace(/\D/g, "");
  if (!digits) return "";
  const country = findCountryByIso(iso) ?? findCountryByIso(DEFAULT_COUNTRY_ISO)!;
  return `${country.dial}${digits}`;
}

/**
 * Lightweight validation: total digits (incl. country code) must be 7–15 per E.164,
 * and India numbers must be exactly 10 national digits. Returns an error string or null.
 */
export function validatePhoneNational(iso: string, national: string): string | null {
  const digits = national.replace(/\D/g, "");
  if (!digits) return null; // empty is allowed (optional field) — caller enforces "required"
  if (iso === "IN" && digits.length !== 10) {
    return "Indian mobile numbers must be 10 digits.";
  }
  const country = findCountryByIso(iso);
  const codeDigits = country ? country.dial.replace(/\D/g, "").length : 0;
  const total = codeDigits + digits.length;
  if (total < 7 || total > 15) {
    return "Enter a valid phone number for the selected country.";
  }
  return null;
}
