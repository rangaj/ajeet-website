/** Inactivity sign-out: alumni members (shared / low-risk browsing). */
export const MEMBER_IDLE_TIMEOUT_MS = 45 * 60 * 1000;

/** Inactivity sign-out: admin console (shorter). */
export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Warning shown this long before idle sign-out. */
export const IDLE_WARNING_BEFORE_MS = 5 * 60 * 1000;

export const IDLE_SESSION_MESSAGE =
  "You were signed out after a period of inactivity. Sign in again to continue.";
