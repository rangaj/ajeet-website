export const EMAIL_LINK_VALID_DAYS = 7;

export function isEmailLinkExpired(request: {
  status: string;
  email_verification_expires_at?: string | null;
}) {
  if (request.status === "expired") return true;
  if (!request.email_verification_expires_at) return false;
  return new Date(request.email_verification_expires_at) < new Date();
}

export function formatEmailLinkExpiry(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}
