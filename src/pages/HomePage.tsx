import { Link } from "react-router-dom";
import {
  ArrowRight,
  IdCard,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

export function HomePage() {
  const { user, canAccessDirectory } = useAuth();

  return (
    <div>
      {/* Full-width hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gold-500/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <Badge variant="gold" className="mb-4 bg-gold-500/20 text-gold-100">
            Sainik School Bijapur
          </Badge>
          <h1 className="font-display text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Welcome to the Ajeet Network
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-brand-100 sm:text-xl">
            Reconnect with fellow Ajeets from Sainik School Bijapur. Claim your existing
            profile or register as a new member — directory access is granted after verification.
          </p>

          {user && canAccessDirectory && (
            <div className="mt-8">
              <Link to="/directory">
                <Button size="lg" variant="accent">
                  Browse Ajeet Directory
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
          {user && !canAccessDirectory && (
            <div className="mt-8">
              <Link to="/pending">
                <Button size="lg" variant="accent">
                  Check Approval Status
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Two-path cards — guest only */}
      {!user && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
              Which path is right for you?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-brand-600">
              Most Ajeets from our previous system should start with Claim. New members
              who are not yet on the platform should register.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden border-2 border-gold-300 shadow-elevated lg:scale-[1.02]">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gold-100" />
              <Badge variant="gold" className="relative">
                Recommended — existing Ajeets
              </Badge>
              <div className="relative mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
                <IdCard className="h-6 w-6 text-gold-400" />
              </div>
              <h3 className="relative mt-4 font-display text-xl font-bold text-brand-900">
                Already an Ajeet?
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-brand-600">
                If you were on our previous system, claim your profile using your roll number
                and the email address we have on file. You will verify via email before access
                is granted.
              </p>
              <Link to="/claim" className="relative mt-6 inline-block">
                <Button size="lg" variant="accent" className="w-full sm:w-auto">
                  Claim My Ajeet ID
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Card>

            <Card className="border-surface-border">
              <Badge variant="default">New to this platform</Badge>
              <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                <UserPlus className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-brand-900">
                Register as a New Ajeet
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-600">
                Not yet registered on the Ajeet Network? Submit your details for admin review.
                You will not have directory access until your registration is approved.
              </p>
              <Link to="/register" className="mt-6 inline-block">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Start Registration
                </Button>
              </Link>
              <p className="mt-3 text-xs text-brand-500">
                Approval is required before you can use the platform.
              </p>
            </Card>
          </div>

          <p className="mt-8 text-center text-sm text-brand-600">
            Already activated your account?{" "}
            <Link to="/login" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
              Sign in here
            </Link>
          </p>
        </section>
      )}

      {/* Feature cards */}
      <section className="border-t border-surface-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h2 className="text-center font-display text-2xl font-bold text-brand-900">
            Built for the Ajeet community
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Card className="border-surface-border transition-shadow hover:shadow-elevated">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Shield className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-brand-900">Secure Activation</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-600">
                Email verification and magic links — no admin-issued passwords. Your roll number
                is your permanent identity on the network.
              </p>
            </Card>
            <Card className="border-surface-border transition-shadow hover:shadow-elevated">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Search className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-brand-900">Searchable Directory</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-600">
                Find fellow Ajeets by batch, course, company, skills, and more — with privacy
                controls you manage yourself.
              </p>
            </Card>
            <Card className="border-surface-border transition-shadow hover:shadow-elevated">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Users className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-brand-900">Admin Verified</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-600">
                New registrations and claim exceptions are reviewed before directory access
                is granted, keeping the network trustworthy.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
