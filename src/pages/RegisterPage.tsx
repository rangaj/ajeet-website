import { useEffect, useMemo, useState } from "react";
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
import { Input, PhoneInput, Select, Textarea } from "@/components/ui/Input";
import { validatePhoneNational, splitE164 } from "@/constants/country-codes";
import { Alert, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";

const STEPS = ["Identity", "School details", "Today", "Review"] as const;

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
  linkedin_link: string;
  twitter_link: string;
  website_link: string;
  is_directory_visible: boolean;
  interested_in_mentoring: boolean;
  interested_in_get_involved: boolean;
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
  linkedin_link: "",
  twitter_link: "",
  website_link: "",
  is_directory_visible: true,
  interested_in_mentoring: false,
  interested_in_get_involved: false,
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

  // Land at the top when moving between wizard steps or showing the result.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step, result]);

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
      if (form.course_start_year.trim()) {
        const start = Number(form.course_start_year);
        const end = Number(form.course_end_year);
        if (!Number.isFinite(start) || start < 1955 || start > 2030) {
          errors.course_start_year = "Enter a valid join year (e.g. 1980).";
        } else if (Number.isFinite(end) && start > end) {
          errors.course_start_year = "Join year cannot be after the passing-out year.";
        }
      }
      // DOB is optional, but validated here against the batch — SSBJ students
      // pass out around age 16–18. Wide slack so genuine cases are never blocked.
      if (form.date_of_birth) {
        const dob = new Date(form.date_of_birth);
        const birthYear = dob.getFullYear();
        const start = Number(form.course_start_year);
        const end = Number(form.course_end_year);
        if (Number.isNaN(dob.getTime()) || birthYear < 1940) {
          errors.date_of_birth = "Enter a valid date of birth.";
        } else if (dob > new Date()) {
          errors.date_of_birth = "Date of birth can't be in the future.";
        } else if (Number.isFinite(end) && end > 0 && (end - birthYear < 15 || end - birthYear > 19)) {
          errors.date_of_birth =
            "Please check your date of birth — students pass out of SSBJ around age 16–18, so this doesn't line up with your batch year.";
        } else if (
          (!Number.isFinite(end) || end <= 0) &&
          Number.isFinite(start) &&
          start > 0 &&
          (start - birthYear < 8 || start - birthYear > 12)
        ) {
          errors.date_of_birth =
            "Please check your date of birth — students join SSBJ around age 10–11, so this doesn't line up with your join year.";
        }
      }
    }

    if (index === 2) {
      const { iso, national } = splitE164(form.mobile_phone);
      const phoneError = validatePhoneNational(iso, national);
      if (phoneError) errors.mobile_phone = phoneError;
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
    if (!validateStep(2)) {
      setStep(2);
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
        linkedin_link: form.linkedin_link.trim() || null,
        twitter_link: form.twitter_link.trim() || null,
        website_link: form.website_link.trim() || null,
        is_directory_visible: form.is_directory_visible,
        interested_in_mentoring: form.interested_in_mentoring,
        interested_in_get_involved: form.interested_in_get_involved,
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
                className="sm:col-span-2"
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
            <Input
              label="Join year"
              type="number"
              value={form.course_start_year}
              onChange={(e) => update("course_start_year", e.target.value)}
              placeholder="e.g. 1980"
              hint="Auto-filled from your batch (≈7 years at school). Adjust it if your batch spent a different number of years."
              error={fieldErrors.course_start_year}
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
            <Input
              label="Date of birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => update("date_of_birth", e.target.value)}
              min="1940-01-01"
              max={new Date().toISOString().split("T")[0]}
              hint="Optional. Should line up with your batch (pass-out age ~16–18)."
              error={fieldErrors.date_of_birth}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-brand-600">
              Optional — helps classmates find you. You can edit these anytime after approval.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <PhoneInput
                  label="Mobile"
                  value={form.mobile_phone}
                  onChange={(value) => update("mobile_phone", value)}
                  hint="Pick your country code, then enter the number without it."
                  error={fieldErrors.mobile_phone}
                />
              </div>
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
                className="sm:col-span-2"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                hint="To list more than one, separate them with “ | ” from oldest to newest — your most recent organisation last."
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="LinkedIn"
                value={form.linkedin_link}
                onChange={(e) => update("linkedin_link", e.target.value)}
                placeholder="https://linkedin.com/in/…"
              />
              <Input
                label="X (Twitter)"
                value={form.twitter_link}
                onChange={(e) => update("twitter_link", e.target.value)}
                placeholder="https://x.com/…"
              />
              <Input
                label="Website"
                className="sm:col-span-2"
                value={form.website_link}
                onChange={(e) => update("website_link", e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-surface-border bg-warm-white p-4">
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300"
                  checked={form.is_directory_visible}
                  onChange={(e) => update("is_directory_visible", e.target.checked)}
                />
                <span>
                  <span className="font-medium text-brand-800">Show me in the alumni directory</span>
                  <span className="block text-xs text-slate-500">
                    Other verified Ajeets can find your profile. You can fine-tune exactly which
                    details are visible after you sign in.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300"
                  checked={form.interested_in_mentoring}
                  onChange={(e) => update("interested_in_mentoring", e.target.checked)}
                />
                <span>
                  <span className="font-medium text-brand-800">I'm interested in mentoring fellow Ajeets</span>
                  <span className="block text-xs text-slate-500">
                    Just an expression of interest — you can set up your mentorship details later.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-300"
                  checked={form.interested_in_get_involved}
                  onChange={(e) => update("interested_in_get_involved", e.target.checked)}
                />
                <span>
                  <span className="font-medium text-brand-800">I'd like to "Get Involved" with alumni initiatives</span>
                  <span className="block text-xs text-slate-500">
                    We'll reach out with ways to contribute. You can update this anytime.
                  </span>
                </span>
              </label>
            </div>
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
                <SummaryRow label="Photo" value={photoPreview ? "Added" : "Not added"} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <h3 className="font-semibold text-brand-900">School details</h3>
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
                <SummaryRow label="Date of birth" value={form.date_of_birth} />
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
                <SummaryRow label="LinkedIn" value={form.linkedin_link} />
                <SummaryRow label="X (Twitter)" value={form.twitter_link} />
                <SummaryRow label="Website" value={form.website_link} />
                <SummaryRow label="Show in directory" value={form.is_directory_visible ? "Yes" : "No"} />
                <SummaryRow label="Interested in mentoring" value={form.interested_in_mentoring ? "Yes" : null} />
                <SummaryRow label="Get Involved" value={form.interested_in_get_involved ? "Yes" : null} />
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
