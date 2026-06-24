import { useEffect, useState } from "react";
import { CONTACT_CATEGORIES, submitContactEnquiry } from "@/lib/contact";
import { FunctionCallError } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Alert, Card } from "@/components/ui/Card";

export function ContactPage() {
  const { user } = useAuth();
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

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
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
      const data = await submitContactEnquiry({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        category,
        message: message.trim(),
      });
      setSuccess(data.message);
      setName(user ? name : "");
      setEmail(user?.email ?? "");
      setCategory("");
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
      <PageHeader title="Contact the Ajeets Alumni Association" />
      <p className="-mt-4 mb-6 text-sm leading-relaxed text-slate-600 sm:text-base">
        Have a question, correction, or issue related to your profile, registration, claim request,
        directory information, or the alumni platform? Please complete the form below and we will
        respond as soon as possible.
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
              label="Name *"
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
