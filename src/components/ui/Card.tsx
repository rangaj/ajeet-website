import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-border bg-white p-6 shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "gold";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-brand-50 text-brand-700",
        variant === "gold" && "bg-gold-100 text-gold-700",
        variant === "success" && "bg-green-100 text-green-800",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "danger" && "bg-red-100 text-red-800",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        variant === "info" && "border border-brand-100 bg-brand-50 text-brand-900",
        variant === "success" && "border border-green-100 bg-green-50 text-green-900",
        variant === "warning" && "border border-amber-100 bg-amber-50 text-amber-900",
        variant === "error" && "border border-red-100 bg-red-50 text-red-900"
      )}
    >
      {children}
    </div>
  );
}
