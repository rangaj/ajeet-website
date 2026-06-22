import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
          <GraduationCap className="h-6 w-6 text-gold-400" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">
          SSBJ Ajeet Network
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-brand-900">{title}</h1>
        <p className="mt-1 text-sm text-brand-600">{subtitle}</p>
      </div>
      {children}
      {footer && <div className="mt-6 text-center text-sm text-brand-600">{footer}</div>}
    </div>
  );
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-elevated sm:p-8">
      {children}
    </div>
  );
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-brand-700 underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
