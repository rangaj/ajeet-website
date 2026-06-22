import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (err) setError(err.message);
    else setMessage("If an account exists, a password reset link has been sent.");
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your verified email to receive a time-limited reset link.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <Alert variant="error">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            Send Reset Link
          </Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
        </p>
      </Card>
    </div>
  );
}
