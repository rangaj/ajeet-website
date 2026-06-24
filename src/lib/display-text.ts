/** Display-only text helpers — never persist transformed values to the database. */

const LOWERCASE_PARTICLES = new Set([
  "and",
  "al",
  "bin",
  "da",
  "de",
  "del",
  "la",
  "le",
  "of",
  "van",
  "von",
]);

const SALUTATION_DISPLAY: Record<string, string> = {
  mr: "Mr.",
  mrs: "Mrs.",
  ms: "Ms.",
  dr: "Dr.",
  prof: "Prof.",
  lt: "Lt.",
  "lt col": "Lt. Col.",
  col: "Col.",
  capt: "Capt.",
  maj: "Maj.",
  gen: "Gen.",
  shri: "Shri",
  smt: "Smt.",
};

function lettersOnly(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "");
}

function isAllCaps(value: string): boolean {
  const letters = lettersOnly(value);
  return letters.length > 0 && letters === letters.toUpperCase();
}

function isAllLower(value: string): boolean {
  const letters = lettersOnly(value);
  return letters.length > 0 && letters === letters.toLowerCase();
}

/** True when the whole string looks like uniform casing (legacy imports). */
export function shouldNormalizeDisplayText(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return isAllCaps(trimmed) || isAllLower(trimmed);
}

function titleCaseToken(token: string, index: number): string {
  if (!token) return token;

  const lower = token.toLowerCase();
  if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
    return lower;
  }

  const apostrophe = token.indexOf("'");
  if (apostrophe > 0) {
    const head = token.slice(0, apostrophe);
    const tail = token.slice(apostrophe + 1);
    const formattedHead = titleCaseToken(head, index);
    const formattedTail = tail
      ? `${tail.charAt(0).toUpperCase()}${tail.slice(1).toLowerCase()}`
      : "";
    return `${formattedHead}'${formattedTail}`;
  }

  const hyphenParts = token.split("-");
  if (hyphenParts.length > 1) {
    return hyphenParts
      .map((part, partIndex) => titleCaseToken(part, partIndex === 0 ? index : 1))
      .join("-");
  }

  return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
}

export function formatDisplayText(value: string | null | undefined): string {
  if (value == null) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!shouldNormalizeDisplayText(trimmed)) return value;

  return trimmed
    .split(/\s+/)
    .map((word, index) => titleCaseToken(word, index))
    .join(" ");
}

export function formatDisplayName(name: string | null | undefined): string {
  return formatDisplayText(name);
}

export function formatDisplayJobPosition(value: string | null | undefined): string {
  return formatDisplayText(value);
}

export function formatDisplayLocation(value: string | null | undefined): string {
  return formatDisplayText(value);
}

function normalizeSalutationKey(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

export function formatDisplaySalutation(salutation: string | null | undefined): string {
  if (!salutation?.trim()) return "";
  const key = normalizeSalutationKey(salutation);
  const mapped = SALUTATION_DISPLAY[key];
  if (mapped) return mapped;
  return formatDisplayText(salutation);
}

/** Directory and profile hero — includes mapped salutation when present. */
export function formatDisplayMemberName({
  name,
  salutation,
}: {
  name: string;
  salutation?: string | null;
}): string {
  const formattedName = formatDisplayName(name);
  const formattedSalutation = formatDisplaySalutation(salutation);
  if (!formattedSalutation) return formattedName;
  return `${formattedSalutation} ${formattedName}`;
}

/** Share cards — formatted given name only (no salutation). */
export function formatDisplayShareName(name: string | null | undefined): string {
  return formatDisplayName(name);
}

/** First token of a full name for compact UI (nav greeting, etc.). */
export function formatDisplayFirstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "";
  const formatted = formatDisplayName(fullName);
  return formatted.trim().split(/\s+/)[0] ?? formatted;
}

export function resolveNavDisplayName({
  memberName,
  metadataName,
  email,
}: {
  memberName?: string | null;
  metadataName?: string | null;
  email?: string | null;
}): string {
  const fromMember = formatDisplayFirstName(memberName);
  if (fromMember) return fromMember;

  const fromMetadata = formatDisplayFirstName(metadataName);
  if (fromMetadata) return fromMetadata;

  const localPart = email?.split("@")[0]?.trim();
  if (localPart) {
    const formatted = formatDisplayText(localPart);
    return formatted || localPart;
  }

  return "Account";
}
