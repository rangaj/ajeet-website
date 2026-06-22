import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Card";
import { AuthCard, AuthLink, AuthShell } from "@/components/layout/AuthShell";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/pending` },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setMessage("Check your email for a magic link or OTP code.");
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
    else navigate("/pending");
  };

  return (
    <AuthShell
      title="Sign In"
      subtitle="Access your Ajeet Network account with email verification or password."
      footer={
        <>
          New here? <AuthLink to="/claim">Claim your ID</AuthLink> or{" "}
          <AuthLink to="/register">register as a new Ajeet</AuthLink>.
        </>
      }
    >
      <AuthCard>
        <div className="flex rounded-xl bg-surface-muted p-1">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              mode === "magic"
                ? "bg-white text-brand-800 shadow-sm"
                : "text-brand-600 hover:text-brand-800"
            )}
            onClick={() => setMode("magic")}
          >
            Magic Link / OTP
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              mode === "password"
                ? "bg-white text-brand-800 shadow-sm"
                : "text-brand-600 hover:text-brand-800"
            )}
            onClick={() => setMode("password")}
          >
            Password
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={mode === "magic" ? handleMagicLink : handlePasswordLogin}
        >
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === "password" && (
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && <Alert variant="error">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : mode === "magic" ? "Send Magic Link" : "Sign In"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-600">
          <AuthLink to="/forgot-password">Forgot password?</AuthLink>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
