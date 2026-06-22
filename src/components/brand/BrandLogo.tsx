import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const AAA_LOGO_SRC = "/aaa-logo.png";
export const SCHOOL_MOTTO = "Ajeet Hain Abheet Hain";

const sizes = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
} as const;

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <img
      src={AAA_LOGO_SRC}
      alt="Ajeet Alumni Association — Sainik School Bijapur"
      className={cn("object-contain", sizes[size], className)}
    />
  );
}

export function BrandMotto({
  variant = "default",
  className,
}: {
  variant?: "default" | "hero" | "subtle" | "footer";
  className?: string;
}) {
  const mottoClass = {
    default: "text-sm font-medium italic tracking-wide text-gold-600",
    hero: "font-display text-lg font-medium italic tracking-wide text-gold-600 sm:text-xl",
    subtle: "text-xs font-medium italic tracking-wide text-brand-500",
    footer: "text-sm font-medium italic tracking-wide text-gold-300",
  }[variant];

  return <p className={cn(mottoClass, className)}>{SCHOOL_MOTTO}</p>;
}

export function BrandLockup({
  variant = "default",
  size = "header",
  asLink = false,
}: {
  variant?: "default" | "inverse";
  size?: "header" | "auth";
  asLink?: boolean;
}) {
  const schoolClass =
    variant === "inverse"
      ? "font-display text-base font-bold text-white sm:text-lg"
      : "font-display text-base font-bold text-brand-900 sm:text-lg";
  const networkClass =
    variant === "inverse"
      ? "text-sm font-medium text-gold-200"
      : "text-sm font-medium text-brand-600";

  const content = (
    <div className="flex items-center gap-3">
      <BrandLogo size={size === "auth" ? "md" : "sm"} />
      <div className="leading-tight">
        <p className={schoolClass}>Sainik School Bijapur</p>
        <p className={networkClass}>Ajeet Alumni Association</p>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link to="/" className="rounded-lg outline-none ring-brand-500 focus-visible:ring-2">
        {content}
      </Link>
    );
  }

  return content;
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <BrandLogo size="md" className="hidden shrink-0 sm:block" />
      <div>
        <p className="text-sm font-semibold text-brand-700">Sainik School Bijapur</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-brand-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brand-600">{subtitle}</p>}
      </div>
    </div>
  );
}
