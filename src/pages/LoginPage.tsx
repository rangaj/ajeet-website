import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Card";

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
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use email magic link or password if you have set one.
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant={mode === "magic" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("magic")}
          >
            Magic Link / OTP
          </Button>
          <Button
            type="button"
            variant={mode === "password" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("password")}
          >
            Password
          </Button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={mode === "magic" ? handleMagicLink : handlePasswordLogin}
        >
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === "password" && (
            <Input
              label="Password"
              type="password"
              required
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

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/forgot-password" className="text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </p>
      </Card>
    </div>
  );
}
