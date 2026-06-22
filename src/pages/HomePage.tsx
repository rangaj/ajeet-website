import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandLogo, BrandMotto } from "@/components/brand/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function PathOption({
  to,
  title,
  description,
  primary = false,
}: {
  to: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center justify-between gap-4 rounded-2xl border p-5 transition-all",
        primary
          ? "border-gold-300 bg-white shadow-elevated hover:border-gold-400 hover:shadow-lg"
          : "border-surface-border bg-white hover:border-brand-200 hover:bg-brand-50/50"
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-lg font-bold",
            primary ? "text-brand-900" : "text-brand-800"
          )}
        >
          {title}
        </p>
        <p className="mt-1 text-sm text-brand-600">{description}</p>
      </div>
      <ChevronRight
        className={cn(
          "h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5",
          primary ? "text-gold-600" : "text-brand-400"
        )}
      />
    </Link>
  );
}

export function HomePage() {
  const { user, canAccessDirectory } = useAuth();

  return (
    <div>
      <section className="border-b border-surface-border bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1fr_22rem] lg:items-center lg:py-20">
          <div className="max-w-xl">
            <BrandLogo size="xl" className="h-28 w-28 sm:h-32 sm:w-32" />

            <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
              Sainik School Bijapur
            </h1>
            <p className="mt-2 text-lg font-medium text-brand-600">
              Ajeet Alumni Association
            </p>
            <BrandMotto variant="hero" className="mt-4" />
            <p className="mt-5 text-lg text-brand-600 text-balance">
              Find and connect with fellow Ajeets across batches and borders.
            </p>

            {user && canAccessDirectory && (
              <Link to="/directory" className="mt-8 inline-block">
                <Button size="lg" variant="accent">
                  Open Directory
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            {user && !canAccessDirectory && (
              <Link to="/pending" className="mt-8 inline-block">
                <Button size="lg" variant="accent">
                  View Approval Status
                </Button>
              </Link>
            )}
          </div>

          {!user && (
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-500">
                Get started
              </p>
              <PathOption
                to="/claim"
                primary
                title="Claim my Ajeet ID"
                description="Already in the alumni database"
              />
              <PathOption
                to="/register"
                title="Register as an Ajeet"
                description="New to this platform"
              />
              <p className="pt-2 text-center text-sm text-brand-600">
                Already activated?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-surface-muted py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3">
          {[
            { value: "1963", label: "Established" },
            { value: "Verified", label: "Member directory" },
            { value: "Secure", label: "Email-verified access" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl font-bold text-brand-900">{stat.value}</p>
              <p className="mt-1 text-sm text-brand-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
