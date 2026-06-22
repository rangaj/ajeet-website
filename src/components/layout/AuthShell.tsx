import { Link } from "react-router-dom";
import { BrandLockup, BrandMotto } from "@/components/brand/BrandLogo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandLockup size="auth" />
        <BrandMotto variant="default" className="mt-4 text-center" />
        <h1 className="mt-6 font-display text-2xl font-bold text-brand-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brand-600">{subtitle}</p>}
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
