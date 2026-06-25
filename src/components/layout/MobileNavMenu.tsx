import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import {
  MOBILE_COLLAPSED_SECTIONS,
  MOBILE_SITE_LINKS,
  type SiteNavLink,
} from "@/constants/site-nav";
import { cn } from "@/lib/utils";

type MobileNavMenuProps = {
  isHome: boolean;
  linkClass: string;
  onNavigate: () => void;
  onOpenDirectory?: () => void;
  /** Hide routes already shown higher in the menu (e.g. Claim CTA, signed-in Directory). */
  excludeTo?: string[];
};

function NavItem({
  link,
  className,
  onNavigate,
  onOpenDirectory,
}: {
  link: SiteNavLink;
  className: string;
  onNavigate: () => void;
  onOpenDirectory?: () => void;
}) {
  if ("to" in link) {
    const isDirectory = link.to === "/directory";
    return (
      <Link
        to={link.to}
        className={className}
        onClick={() => {
          if (isDirectory) onOpenDirectory?.();
          onNavigate();
        }}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onNavigate}
    >
      {link.label}
    </a>
  );
}

export function MobileNavMenu({
  isHome,
  linkClass,
  onNavigate,
  onOpenDirectory,
  excludeTo = [],
}: MobileNavMenuProps) {
  const exclude = new Set(excludeTo);
  const siteLinks = MOBILE_SITE_LINKS.filter(
    (link) => !("to" in link) || !exclude.has(link.to)
  );
  const sectionLabel = cn(
    "px-3 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider",
    isHome ? "text-gold-300/90" : "text-brand-500"
  );

  const summaryClass = cn(
    linkClass,
    "flex list-none cursor-pointer items-center justify-between [&::-webkit-details-marker]:hidden"
  );

  const nestedLinkClass = cn(
    "block rounded-lg px-3 py-2 pl-5 text-sm transition-colors",
    isHome
      ? "text-white/85 hover:bg-white/10 hover:text-white"
      : "text-brand-800/80 hover:bg-brand-50 hover:text-brand-700"
  );

  return (
    <>
      <p className={sectionLabel}>Explore</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {siteLinks.map((link) => (
          <NavItem
            key={link.label}
            link={link}
            className={cn(linkClass, "text-sm")}
            onNavigate={onNavigate}
            onOpenDirectory={onOpenDirectory}
          />
        ))}
      </div>

      {MOBILE_COLLAPSED_SECTIONS.map((section) => (
        <details key={section.title} className="group mt-1">
          <summary className={summaryClass}>
            <span>{section.title}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className={cn(
            "mt-0.5 space-y-0.5 border-l-2 pl-2 ml-3",
            isHome ? "border-gold-400/30" : "border-brand-200"
          )}>
            {section.links.map((link) => (
              <NavItem
                key={link.label}
                link={link}
                className={nestedLinkClass}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </details>
      ))}
    </>
  );
}
