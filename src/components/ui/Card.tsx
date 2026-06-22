import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-slate-100 text-slate-700",
        variant === "success" && "bg-green-100 text-green-800",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "danger" && "bg-red-100 text-red-800"
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
        "rounded-lg px-4 py-3 text-sm",
        variant === "info" && "bg-brand-50 text-brand-900 border border-brand-100",
        variant === "success" && "bg-green-50 text-green-900 border border-green-100",
        variant === "warning" && "bg-amber-50 text-amber-900 border border-amber-100",
        variant === "error" && "bg-red-50 text-red-900 border border-red-100"
      )}
    >
      {children}
    </div>
  );
}
