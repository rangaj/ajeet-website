import { Link } from "react-router-dom";
import { Users, Shield, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

export function HomePage() {
  const { user, canAccessDirectory } = useAuth();

  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
          School Alumni Directory
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Connect with fellow alumni. Claim your imported profile or register as a new member.
          Directory access is granted after verification and admin approval.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!user && (
            <>
              <Link to="/claim"><Button size="lg">Claim My Profile</Button></Link>
              <Link to="/register"><Button size="lg" variant="secondary">New Registration</Button></Link>
              <Link to="/login"><Button size="lg" variant="ghost">Sign In</Button></Link>
            </>
          )}
          {user && canAccessDirectory && (
            <Link to="/directory"><Button size="lg">Browse Directory</Button></Link>
          )}
          {user && !canAccessDirectory && (
            <Link to="/pending"><Button size="lg" variant="secondary">Check Approval Status</Button></Link>
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <Search className="mb-3 h-8 w-8 text-brand-600" />
          <h3 className="font-semibold text-slate-900">Searchable Directory</h3>
          <p className="mt-2 text-sm text-slate-600">
            Find alumni by name, roll number, batch, company, skills, and more—with privacy controls.
          </p>
        </Card>
        <Card>
          <Shield className="mb-3 h-8 w-8 text-brand-600" />
          <h3 className="font-semibold text-slate-900">Secure Activation</h3>
          <p className="mt-2 text-sm text-slate-600">
            Email OTP and magic link verification. No admin-issued passwords. Roll number is your identity.
          </p>
        </Card>
        <Card>
          <Users className="mb-3 h-8 w-8 text-brand-600" />
          <h3 className="font-semibold text-slate-900">Admin Reviewed</h3>
          <p className="mt-2 text-sm text-slate-600">
            New registrations and claim exceptions are reviewed before directory access is granted.
          </p>
        </Card>
      </section>
    </div>
  );
}
