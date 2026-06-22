import { useState } from "react";
import { Link } from "react-router-dom";
import { invokeFunction, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";

export function ClaimPage() {
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [error, setError] = useState("");

  const ensureAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (otpError) throw otpError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      await ensureAuth();
      const data = await invokeFunction<{ status: string; message: string }>("start-claim", {
        roll_number: rollNumber,
        email,
        phone: phone || undefined,
        date_of_birth: dob || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <h1 className="text-2xl font-bold text-slate-900">Claim Imported Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          If your record was imported by the school, enter your roll number and email to claim it.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Roll Number"
            required
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. 2015-CS-042"
          />
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Mobile Phone (optional verification)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Date of Birth (optional verification)"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          {error && <Alert variant="error">{error}</Alert>}
          {result && (
            <Alert variant={result.status === "admin_review" ? "warning" : "success"}>
              {result.message}
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Start Claim"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Not in the database?{" "}
          <Link to="/register" className="text-brand-600 hover:underline">Register as new alumni</Link>
        </p>
      </Card>
    </div>
  );
}
