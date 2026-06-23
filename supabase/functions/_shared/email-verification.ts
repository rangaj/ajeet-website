export const EMAIL_LINK_VALID_DAYS = 7;

export const AWAITING_EMAIL_STATUS = "awaiting_email_verification" as const;
export const EXPIRED_STATUS = "expired" as const;

export function emailVerificationExpiresAt(from = new Date()) {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + EMAIL_LINK_VALID_DAYS);
  return expires.toISOString();
}
