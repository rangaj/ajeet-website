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
        "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-all",
        primary
          ? "border-gold-300 bg-white shadow-card hover:border-gold-400"
          : "border-surface-border bg-white hover:border-brand-200 hover:bg-brand-50/50"
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-base font-bold",
            primary ? "text-brand-900" : "text-brand-800"
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 text-sm text-brand-600">{description}</p>
      </div>
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
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
        <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="xl" className="h-28 max-h-28 sm:h-32 sm:max-h-32" />
            <BrandMotto variant="hero" className="mt-4" />
          </div>

          {user && canAccessDirectory && (
            <div className="mt-8 text-center">
              <Link to="/directory">
                <Button size="lg" variant="accent">
                  Open Directory
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {user && !canAccessDirectory && (
            <div className="mt-8 text-center">
              <Link to="/pending">
                <Button size="lg" variant="accent">
                  View Approval Status
                </Button>
              </Link>
            </div>
          )}

          {!user && (
            <div className="mt-8 space-y-2.5">
              <p className="mb-4 text-center text-sm text-brand-600">
                Find and connect with fellow Ajeets across batches and borders.
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

      <section className="bg-surface-muted py-6">
        <div className="mx-auto grid max-w-lg gap-6 px-4 sm:grid-cols-3 sm:px-6">
          {[
            { value: "1963", label: "Established" },
            { value: "Verified", label: "Member directory" },
            { value: "Secure", label: "Email-verified access" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-xl font-bold text-brand-900 sm:text-2xl">
                {stat.value}
              </p>
              <p className="mt-0.5 text-sm text-brand-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
