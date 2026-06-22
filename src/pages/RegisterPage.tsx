import { useState } from "react";
import { Link } from "react-router-dom";
import { invokeFunction, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";

export function RegisterPage() {
  const [form, setForm] = useState({
    roll_number: "",
    email: "",
    name: "",
    course: "",
    stream: "",
    course_start_year: "",
    course_end_year: "",
    mobile_phone: "",
    company: "",
    job_position: "",
    current_location: "",
    house: "",
  });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [error, setError] = useState("");

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    if (!/^\d+$/.test(form.roll_number.trim())) {
      setError("Enter your school roll number using digits only.");
      setLoading(false);
      return;
    }

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: { shouldCreateUser: true },
      });
      if (otpError) throw otpError;

      let evidence_path: string | undefined;
      if (evidenceFile) {
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id ?? crypto.randomUUID();
        const path = `${uid}/${Date.now()}-${evidenceFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence-uploads")
          .upload(path, evidenceFile);
        if (uploadError) throw uploadError;
        evidence_path = path;
      }

      const data = await invokeFunction<{ status: string; message: string }>("start-registration", {
        roll_number: form.roll_number,
        email: form.email,
        evidence_path,
        payload: {
          name: form.name,
          course: form.course,
          stream: form.stream,
          course_start_year: form.course_start_year ? Number(form.course_start_year) : null,
          course_end_year: form.course_end_year ? Number(form.course_end_year) : null,
          mobile_phone: form.mobile_phone,
          company: form.company,
          job_position: form.job_position,
          current_location: form.current_location,
          house: form.house,
        },
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Register as an Ajeet" subtitle="Admin approval required" />
      <Card>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Input
            label="School Roll Number *"
            required
            value={form.roll_number}
            onChange={(e) => update("roll_number", e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 1247"
            inputMode="numeric"
            pattern="[0-9]*"
            hint="Digits only, as issued at Sainik School Bijapur."
          />
          <Input label="Email *" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
          <Input label="Full Name *" required className="sm:col-span-2" value={form.name} onChange={(e) => update("name", e.target.value)} />
          <Input label="Course" value={form.course} onChange={(e) => update("course", e.target.value)} />
          <Input label="Stream" value={form.stream} onChange={(e) => update("stream", e.target.value)} />
          <Input label="Start Year" type="number" value={form.course_start_year} onChange={(e) => update("course_start_year", e.target.value)} />
          <Input label="End Year" type="number" value={form.course_end_year} onChange={(e) => update("course_end_year", e.target.value)} />
          <Input label="Mobile Phone" value={form.mobile_phone} onChange={(e) => update("mobile_phone", e.target.value)} />
          <Input label="House" value={form.house} onChange={(e) => update("house", e.target.value)} />
          <Input label="Company" value={form.company} onChange={(e) => update("company", e.target.value)} />
          <Input label="Position" value={form.job_position} onChange={(e) => update("job_position", e.target.value)} />
          <Input label="Current Location" className="sm:col-span-2" value={form.current_location} onChange={(e) => update("current_location", e.target.value)} />

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-brand-800">
              Proof of enrollment (optional)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="mt-1 block w-full text-sm"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && <div className="sm:col-span-2"><Alert variant="error">{error}</Alert></div>}
          {result && (
            <div className="sm:col-span-2">
              <Alert variant={result.status === "conflict_review" ? "warning" : "success"}>
                {result.message}
              </Alert>
            </div>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Registration"}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-brand-600">
          Already imported?{" "}
          <Link to="/claim" className="font-semibold text-brand-700 hover:underline">Claim your ID</Link>
        </p>
      </Card>
    </div>
  );
}
