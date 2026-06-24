import { BrandLogo } from "@/components/brand/BrandLogo";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function CommunityPlaceholderPage({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl pb-10", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
        <div
          className="pointer-events-none absolute -right-8 -top-8 opacity-[0.06]"
          aria-hidden
        >
          <BrandLogo size="xl" />
        </div>
        <div className="border-b border-gold-200/60 bg-gradient-to-br from-brand-900 to-brand-800 px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-300">
            Ajeet Alumni Association
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        </div>
        <Card className="relative border-0 shadow-none">
          <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
}
