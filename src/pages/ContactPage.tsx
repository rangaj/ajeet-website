import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CONTACT_CATEGORIES, isEnquiryCategory, submitContactEnquiry } from "@/lib/contact";
import { FunctionCallError } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Alert, Card } from "@/components/ui/Card";

export function ContactPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  useEffect(() => {
    const preset = searchParams.get("category");
    if (preset && isEnquiryCategory(preset)) {
      setCategory(preset);
    }
  }, [searchParams]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Full name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!category) next.category = "Please select a category.";
    if (!message.trim()) next.message = "Message is required.";
    else if (message.trim().length < 10) {
      next.message = "Please enter at least 10 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;

    setLoading(true);
    try {
      await submitContactEnquiry({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category,
        message: message.trim(),
      });
      setSuccess(
        "Thank you for contacting us. We have received your message and will get back to you soon."
      );
      setName(user ? name : "");
      setEmail(user?.email ?? "");
      if (!searchParams.get("category")) setCategory("");
      setMessage("");
    } catch (err) {
      setError(
        err instanceof FunctionCallError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not send your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <PageHeader title="Contact Us" />
      <p className="-mt-4 mb-6 text-sm leading-relaxed text-slate-600 sm:text-base">
        We would be happy to hear from you. Whether you have a question about your profile, need help
        with registration, wish to report incorrect information, or would like to get involved with
        the Association, please use the form below. A member of the team will respond as soon as
        possible.
      </p>

      {success ? (
        <Card>
          <Alert variant="success">{success}</Alert>
          <Button className="mt-4" variant="secondary" onClick={() => setSuccess("")}>
            Send another message
          </Button>
        </Card>
      ) : (
        <Card>
          <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
            <Input
              label="Full name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Email address *"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />
            <Select
              label="Category *"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[...CONTACT_CATEGORIES]}
              error={errors.category}
            />
            <div className="space-y-1">
              <Textarea
                label="Message *"
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us how we can help…"
              />
              {errors.message && <p className="text-xs text-red-600">{errors.message}</p>}
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Sending…" : "Send message"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
