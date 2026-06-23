import { useState } from "react";
import { Link } from "react-router-dom";
import { invokeFunction } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";

export function ClaimPage() {
  const [rollNumber, setRollNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(rollNumber.trim())) {
      setError("Enter your school roll number using digits only (e.g. 1247).");
      return;
    }
    const roll = String(parseInt(rollNumber.trim(), 10));
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await invokeFunction<{ status: string; message: string }>("start-claim", {
        roll_number: roll,
        email,
        email_redirect_to: `${window.location.origin}/pending`,
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
      <PageHeader title="Claim your Ajeet ID" subtitle="Roll number and email on file" />
      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="School Roll Number"
            required
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 1247"
            inputMode="numeric"
            pattern="[0-9]*"
            hint="Your Sainik School Bijapur roll number (digits only, as issued at the school)."
          />
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Mobile (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Date of birth (optional)"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          {error && <Alert variant="error">{error}</Alert>}
          {result && (
            <Alert variant={result.status === "admin_review" || result.status === "already_pending" ? "warning" : "success"}>
              {result.message}
              {result.status === "otp_sent" && (
                <span>
                  {" "}
                  After verifying, visit{" "}
                  <Link to="/pending" className="font-semibold underline">Pending approval</Link>.
                </span>
              )}
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Processing..." : "Start Claim"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-600">
          Not in the system?{" "}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">Register</Link>
        </p>
      </Card>
    </div>
  );
}
