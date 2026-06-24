const RECOVERY_KEY = "password_recovery_pending";

/** True when the URL hash is a Supabase password-recovery link (implicit flow). */
export function isRecoveryHash(): boolean {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.includes("access_token")) return false;
  return new URLSearchParams(hash).get("type") === "recovery";
}

export function isRecoveryPending(): boolean {
  return sessionStorage.getItem(RECOVERY_KEY) === "1";
}

export function markRecoveryPending(): void {
  sessionStorage.setItem(RECOVERY_KEY, "1");
}

export function clearRecoveryPending(): void {
  sessionStorage.removeItem(RECOVERY_KEY);
}

/**
 * Run before React mounts so recovery tokens are not lost to role-based redirects.
 * Keeps the hash intact when sending the browser to /reset-password.
 */
export function bootstrapRecoveryRedirect(): void {
  if (!isRecoveryHash()) return;
  markRecoveryPending();
  const { pathname, hash } = window.location;
  if (pathname !== "/reset-password") {
    window.location.replace(`/reset-password${hash}`);
  }
}
