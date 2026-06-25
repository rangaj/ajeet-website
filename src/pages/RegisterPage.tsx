import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { HouseSelector } from "@/components/register/HouseSelector";
import { PolicyConsentCheckbox } from "@/components/register/PolicyConsentCheckbox";
import { formatHouses } from "@/constants/houses";
import { joinYearStringFromBatch } from "@/constants/school-years";
import { storePendingAvatar } from "@/lib/image";
import { FunctionCallError, invokeFunction } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Alert, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";

const STEPS = ["Identity", "Batch & house", "Today", "Review"] as const;

const SALUTATION_OPTIONS = [
  { value: "", label: "—" },
  { value: "Mr", label: "Mr" },
  { value: "Ms", label: "Ms" },
  { value: "Mrs", label: "Mrs" },
  { value: "Dr", label: "Dr" },
  { value: "Col", label: "Col" },
  { value: "Maj", label: "Maj" },
  { value: "Capt", label: "Capt" },
];

interface RegForm {
  name: string;
  salutation: string;
  roll_number: string;
  email: string;
  date_of_birth: string;
  course_start_year: string;
  course_end_year: string;
  houses: string[];
  mobile_phone: string;
  secondary_email: string;
  current_location: string;
  home_town: string;
  company: string;
  job_position: string;
  work_experience_years: string;
  professional_skills: string;
  industries_worked_in: string;
}

const emptyForm = (): RegForm => ({
  name: "",
  salutation: "",
  roll_number: "",
  email: "",
  date_of_birth: "",
  course_start_year: "",
  course_end_year: "",
  houses: [],
  mobile_phone: "",
  secondary_email: "",
  current_location: "",
  home_town: "",
  company: "",
  job_position: "",
  work_experience_years: "",
  professional_skills: "",
  industries_worked_in: "",
});

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function RegistrationHelpLinks({ code }: { code?: string }) {
  if (!code) return null;

  if (code === "use_claim_flow" || code === "roll_exists") {
    return (
      <p className="mt-3 text-sm">
        <Link to="/claim" className="font-semibold text-brand-700 hover:underline">
          Claim your Ajeet ID
        </Link>
        {" · "}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    );
  }

  if (code === "already_registered") {
    return (
      <p className="mt-3 text-sm">
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in to your account
        </Link>
      </p>
    );
  }

  if (code === "already_pending") {
    return (
      <p className="mt-3 text-sm">
        <Link to="/pending" className="font-semibold text-brand-700 hover:underline">
          Check pending approval
        </Link>
        {" · "}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    );
  }

  return null;
}

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegForm>(emptyForm);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);

  const update = <K extends keyof RegForm>(key: K, value: RegForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const setBatchYear = (batchYear: string) => {
    setForm((f) => ({
      ...f,
      course_end_year: batchYear,
      course_start_year: joinYearStringFromBatch(batchYear),
    }));
    setFieldErrors((e) => {
      const next = { ...e };
      delete next.course_end_year;
      delete next.course_start_year;
      return next;
    });
  };

  const validateStep = (index: number): boolean => {
    const errors: Record<string, string> = {};

    if (index === 0) {
      if (!form.name.trim()) errors.name = "Full name is required.";
      if (!/^\d+$/.test(form.roll_number.trim())) {
        errors.roll_number = "Enter your school roll number using digits only.";
      }
      if (!form.email.trim()) errors.email = "Email is required.";
    }

    if (index === 1) {
      if (!form.course_end_year.trim()) {
        errors.course_end_year = "Batch year (passing out) is required.";
      } else {
        const end = Number(form.course_end_year);
        if (!Number.isFinite(end) || end < 1963 || end > 2030) {
          errors.course_end_year = "Enter a valid batch year (e.g. 1987).";
        }
      }
      if (form.houses.length === 0) errors.houses = "Select at least one house.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const houseLabel = useMemo(() => formatHouses(form.houses), [form.houses]);

  const handleSubmit = async () => {
    if (!validateStep(0)) {
      setStep(0);
      return;
    }
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (!agreedToPolicies) {
      setFieldErrors({ policies: "You must agree to the policies to register." });
      setStep(3);
      return;
    }

    setLoading(true);
    setError("");
    setErrorCode(undefined);
    setResult(null);

    const roll = String(parseInt(form.roll_number.trim(), 10));

    try {
      if (photoBlob) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read photo"));
          reader.readAsDataURL(photoBlob);
        });
        storePendingAvatar(dataUrl);
      }

      const payload = {
        name: form.name.trim(),
        salutation: form.salutation || null,
        date_of_birth: form.date_of_birth || null,
        course_start_year: form.course_start_year ? Number(form.course_start_year) : null,
        course_end_year: form.course_end_year ? Number(form.course_end_year) : null,
        houses: form.houses,
        house: houseLabel,
        mobile_phone: form.mobile_phone || null,
        secondary_email: form.secondary_email || null,
        current_location: form.current_location || null,
        home_town: form.home_town || null,
        company: form.company || null,
        job_position: form.job_position || null,
        work_experience_years: form.work_experience_years
          ? Number(form.work_experience_years)
          : null,
        professional_skills: form.professional_skills || null,
        industries_worked_in: form.industries_worked_in || null,
      };

      const data = await invokeFunction<{ status: string; message: string }>("start-registration", {
        roll_number: roll,
        email: form.email.trim().toLowerCase(),
        email_redirect_to: `${window.location.origin}/pending`,
        payload,
      });

      setResult({
        status: data.status,
        message: data.message ?? "Registration submitted. Check your email to verify, and then await approval.",
      });
    } catch (err) {
      if (err instanceof FunctionCallError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
        setErrorCode(undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="Registration Submitted" />
        <Card className="space-y-4">
          {(result.status === "conflict_review" || result.status === "already_pending") && (
            <Alert variant="warning">{result.message}</Alert>
          )}
          {result.status !== "conflict_review" && result.status !== "already_pending" && (
            <>
              <p className="text-sm leading-relaxed text-slate-700">
                Thank you for registering with the Ajeet Alumni Platform. Please verify your email
                address and complete any remaining steps required for profile activation. You will
                receive further updates by email.
              </p>
            </>
          )}
          {(result.status === "conflict_review" || result.status === "already_pending") && (
            <p className="text-sm text-brand-600">
              Check status on the{" "}
              <Link to="/pending" className="font-semibold text-brand-700 hover:underline">
                pending page
              </Link>
              .
            </p>
          )}
          <Link to="/">
            <Button variant="secondary">Return to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Register as an Ajeet" subtitle="Join the alumni directory" />

      <div className="mb-6">
        <div className="flex justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={i === step ? "text-brand-700" : i < step ? "text-brand-500" : ""}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gold-500 transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        {step === 0 && (
          <div className="space-y-5">
            <AvatarUpload
              name={form.name || "Ajeet"}
              previewUrl={photoPreview}
              onPreviewChange={setPhotoPreview}
              onBlobReady={setPhotoBlob}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name *"
                required
                className="sm:col-span-2"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                error={fieldErrors.name}
              />
              <Select
                label="Salutation"
                options={SALUTATION_OPTIONS}
                value={form.salutation}
                onChange={(e) => update("salutation", e.target.value)}
              />
              <Input
                label="Date of birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
              />
              <Input
                label="School roll number *"
                required
                value={form.roll_number}
                onChange={(e) => update("roll_number", e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 1247"
                inputMode="numeric"
                hint="Digits only, as issued at Sainik School Bijapur."
                error={fieldErrors.roll_number}
              />
              <Input
                label="Email *"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                error={fieldErrors.email}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Input
              label="Batch year (passing out) *"
              type="number"
              required
              value={form.course_end_year}
              onChange={(e) => setBatchYear(e.target.value)}
              placeholder="e.g. 1987"
              hint="Your passing-out year at Sainik School Bijapur. Join year is calculated automatically (usually 7 years at school; Batch 1982 joined in 1974)."
              error={fieldErrors.course_end_year}
            />
            {form.course_start_year && form.course_end_year && (
              <p className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800">
                At SSBJ: <strong>{form.course_start_year} – {form.course_end_year}</strong>
                {" "}(joined in {form.course_start_year})
              </p>
            )}
            <HouseSelector
              value={form.houses}
              onChange={(houses) => update("houses", houses)}
              error={fieldErrors.houses}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-brand-600">
              Optional — helps classmates find you. You can edit these anytime after approval.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Mobile"
                value={form.mobile_phone}
                onChange={(e) => update("mobile_phone", e.target.value)}
              />
              <Input
                label="Secondary email"
                type="email"
                value={form.secondary_email}
                onChange={(e) => update("secondary_email", e.target.value)}
              />
              <Input
                label="Current location"
                value={form.current_location}
                onChange={(e) => update("current_location", e.target.value)}
              />
              <Input
                label="Home town"
                value={form.home_town}
                onChange={(e) => update("home_town", e.target.value)}
              />
              <Input
                label="Company"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
              />
              <Input
                label="Position"
                value={form.job_position}
                onChange={(e) => update("job_position", e.target.value)}
              />
              <Input
                label="Years of experience"
                type="number"
                min={0}
                step={0.5}
                value={form.work_experience_years}
                onChange={(e) => update("work_experience_years", e.target.value)}
              />
            </div>
            <Textarea
              label="Skills"
              value={form.professional_skills}
              onChange={(e) => update("professional_skills", e.target.value)}
            />
            <Textarea
              label="Industries worked in"
              value={form.industries_worked_in}
              onChange={(e) => update("industries_worked_in", e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-brand-900">Identity</h3>
              <div className="mt-2">
                <SummaryRow label="Name" value={form.salutation ? `${form.salutation} ${form.name}` : form.name} />
                <SummaryRow label="Roll" value={form.roll_number} />
                <SummaryRow label="Email" value={form.email} />
                <SummaryRow label="Date of birth" value={form.date_of_birth} />
                <SummaryRow label="Photo" value={photoPreview ? "Added" : "Not added"} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-brand-900">Batch & house</h3>
              <div className="mt-2">
                <SummaryRow label="Batch" value={form.course_end_year} />
                <SummaryRow
                  label="At SSBJ"
                  value={
                    form.course_start_year && form.course_end_year
                      ? `${form.course_start_year} – ${form.course_end_year}`
                      : null
                  }
                />
                <SummaryRow label="House(s)" value={houseLabel} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-brand-900">Today</h3>
              <div className="mt-2">
                <SummaryRow label="Mobile" value={form.mobile_phone} />
                <SummaryRow label="Location" value={form.current_location} />
                <SummaryRow label="Company" value={form.company} />
                <SummaryRow label="Position" value={form.job_position} />
                <SummaryRow label="Skills" value={form.professional_skills} />
              </div>
            </div>
            <Alert variant="info">
              A super admin will review your request manually. Check your email to verify, and then
              await approval.
            </Alert>
            <PolicyConsentCheckbox
              checked={agreedToPolicies}
              onChange={(checked) => {
                setAgreedToPolicies(checked);
                if (checked) {
                  setFieldErrors((errors) => {
                    const next = { ...errors };
                    delete next.policies;
                    return next;
                  });
                }
              }}
              error={fieldErrors.policies}
            />
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Alert variant="error">
              {error}
              <RegistrationHelpLinks code={errorCode} />
            </Alert>
          </div>
        )}

        <div className="mt-6 flex justify-between gap-3">
          <Button type="button" variant="secondary" onClick={goBack} disabled={step === 0 || loading}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? "Submitting..." : "Submit registration"}
            </Button>
          )}
        </div>
      </Card>

      <p className="mt-4 text-center text-sm text-brand-600">
        Already in our records?{" "}
        <Link to="/claim" className="font-semibold text-brand-700 hover:underline">
          Claim your ID
        </Link>
      </p>
    </div>
  );
}
