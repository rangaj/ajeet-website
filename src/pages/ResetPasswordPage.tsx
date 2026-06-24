import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { resolvePostAuthPath } from "@/lib/auth-landing";
import {
  clearRecoveryPending,
  isRecoveryHash,
  isRecoveryPending,
  markRecoveryPending,
} from "@/lib/auth-recovery";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Card";
import { AuthCard, AuthLink, AuthShell } from "@/components/layout/AuthShell";

async function markPasswordSet(userId: string) {
  await supabase
    .from("profiles")
    .update({ password_set_at: new Date().toISOString() })
    .eq("id", userId);
}

function hashType(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("type");
}

export function ResetPasswordPage() {
  const { refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = (recovery: boolean, session: boolean) => {
      if (recovery) markRecoveryPending();
      setIsRecovery(recovery);
      setHasSession(session);
      setReady(true);
    };

    const recoveryFromHash = hashType() === "recovery" || isRecoveryHash();
    if (recoveryFromHash || isRecoveryPending()) {
      markRecoveryPending();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const recovery =
        recoveryFromHash ||
        isRecoveryPending() ||
        event === "PASSWORD_RECOVERY" ||
        hashType() === "recovery";
      sync(recovery, Boolean(session));
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      sync(recoveryFromHash || isRecoveryPending(), Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (user) {
      await markPasswordSet(user.id);
      await refreshProfile();
    }

    clearRecoveryPending();
    const path = await resolvePostAuthPath();
    window.location.replace(path);
  };

  const title = isRecovery ? "Reset your password" : "Choose a password";
  const subtitle = isRecovery
    ? "Enter a new password for your account"
    : "Set a password for faster sign-in next time";

  if (!ready) {
    return (
      <AuthShell title={title} subtitle="Loading...">
        <AuthCard>
          <p className="text-sm text-brand-600">Verifying your link...</p>
        </AuthCard>
      </AuthShell>
    );
  }

  if (!hasSession) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="Request a new password link"
        footer={
          <>
            <AuthLink to="/forgot-password">Send reset link</AuthLink>
            {" · "}
            <AuthLink to="/login">Sign in</AuthLink>
          </>
        }
      >
        <AuthCard>
          <Alert variant="warning">
            This password link is invalid or has expired. Use forgot password to get a new one, or
            sign in with a magic link.
          </Alert>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <>
          Prefer email sign-in? <AuthLink to="/login">Use a magic link</AuthLink>
        </>
      }
    >
      <AuthCard>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="New password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="At least 8 characters."
          />
          <Input
            label="Confirm password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save password"}
          </Button>
        </form>
        {!isRecovery && (
          <p className="mt-4 text-center text-sm text-brand-600">
            <Link to="/forgot-password" className="font-semibold underline">
              Email me a setup link instead
            </Link>
          </p>
        )}
      </AuthCard>
    </AuthShell>
  );
}
