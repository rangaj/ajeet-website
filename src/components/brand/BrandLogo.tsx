import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

import { AAA_MOTTO } from "@/constants/brand";

export const AAA_LOGO_SRC = "/aaa-logo.png";
/** @deprecated Use AAA_MOTTO from @/constants/brand for new copy */
export const SCHOOL_MOTTO = AAA_MOTTO.replace(/\.\s+/g, " ");

const sizes = {
  sm: "h-10 w-auto max-h-10",
  md: "h-16 w-auto max-h-16",
  lg: "h-24 w-auto max-h-24",
  xl: "h-32 w-auto max-h-32",
} as const;

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes | "hero";
  className?: string;
}) {
  const sizeClass =
    size === "hero"
      ? "h-auto w-[92px] max-w-[100px] sm:w-[140px] sm:max-w-[150px]"
      : sizes[size as keyof typeof sizes];

  return (
    <img
      src={AAA_LOGO_SRC}
      alt="Ajeet Alumni Association — Sainik School Bijapur"
      className={cn("bg-transparent object-contain", sizeClass, className)}
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
      ? "text-xs font-medium text-gold-200 sm:text-sm"
      : "text-xs font-medium text-brand-600 sm:text-sm";
  const networkClass =
    variant === "inverse"
      ? "font-display text-sm font-bold text-white sm:text-base"
      : "font-display text-sm font-bold text-brand-900 sm:text-base";

  const content = (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <BrandLogo size={size === "auth" ? "md" : "sm"} className="shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className={cn(networkClass, "break-words")}>Ajeet Alumni Association</p>
        <p className={cn(schoolClass, "break-words")}>Sainik School Bijapur</p>
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        className="block min-w-0 rounded-lg outline-none ring-brand-500 focus-visible:ring-2"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function MarketingNavBrand({ inverse = false }: { inverse?: boolean }) {
  return <BrandLockup variant={inverse ? "inverse" : "default"} size="header" asLink />;
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
