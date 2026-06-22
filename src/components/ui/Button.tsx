import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
        variant === "accent" &&
          "bg-gold-500 text-brand-900 shadow-sm hover:bg-gold-400 active:bg-gold-600",
        variant === "secondary" &&
          "border border-surface-border bg-white text-brand-700 hover:border-brand-200 hover:bg-brand-50",
        variant === "outline" &&
          "border-2 border-gold-500 bg-transparent text-white shadow-none hover:border-gold-400 hover:bg-gold-500/10",
        variant === "ghost" && "text-brand-600 hover:bg-brand-50",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
