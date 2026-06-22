import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { BrandLockup, BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-lg px-3 py-2 transition-colors",
    isActive
      ? "bg-brand-50 font-semibold text-brand-700"
      : "text-brand-800/80 hover:bg-brand-50 hover:text-brand-700"
  );

const marketingNavOnDark =
  "rounded-lg px-2.5 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white lg:px-3";

const marketingNavOnLight =
  "rounded-lg px-2.5 py-2 text-sm font-medium text-brand-800/80 transition-colors hover:bg-brand-50 hover:text-brand-700 lg:px-3";

function marketingNavClass(isHome: boolean) {
  return isHome ? marketingNavOnDark : marketingNavOnLight;
}

function MarketingNavLink({
  href,
  children,
  onClick,
  className,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const { pathname } = useLocation();
  const to = pathname === "/" ? href.replace("/#", "#") : href.startsWith("/") ? href : `/#${href}`;

  if (to.startsWith("#") || to.includes("#")) {
    return (
      <a href={to} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function AppLayout() {
  const { user, isAdmin, canAccessDirectory, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location.pathname === "/";
  const isFullBleed =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/forgot-password";

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  const headerClass = cn(
    "sticky top-0 z-50",
    isHome
      ? "fixed inset-x-0 border-b border-white/10 bg-brand-900/30 backdrop-blur-sm"
      : "sticky top-0 border-b border-surface-border bg-white/95 backdrop-blur-md"
  );

  const footerLinks = [
    { label: "About", href: "/#about" },
    { label: "Directory", to: "/directory" },
    { label: "Events", href: "/#why-join" },
    { label: "Stories", href: "/#legacy" },
    { label: "Privacy Policy", href: "/#heritage" },
    { label: "Terms of Use", href: "/#heritage" },
    { label: "Contact Us", href: "/#heritage" },
  ] as const;

  return (
    <div className={cn("flex min-h-screen flex-col", isHome ? "bg-white" : "bg-surface-muted")}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div onClick={closeMobile}>
            {isHome ? (
              <Link to="/" className="flex items-center gap-3 rounded-lg">
                <BrandLogo size="sm" />
                <div className="leading-tight">
                  <p className="font-display text-sm font-bold text-white sm:text-base">
                    Ajeet Alumni Association
                  </p>
                </div>
              </Link>
            ) : (
              <BrandLockup size="header" asLink />
            )}
          </div>

          <nav className="hidden items-center gap-0.5 text-sm lg:flex">
            {!user && (
              <>
                <MarketingNavLink href="/#about" className={marketingNavClass(isHome)}>
                  About
                </MarketingNavLink>
                <Link to="/directory" className={marketingNavClass(isHome)}>
                  Directory
                </Link>
                <MarketingNavLink href="/#why-join" className={marketingNavClass(isHome)}>
                  Events
                </MarketingNavLink>
                <MarketingNavLink href="/#legacy" className={marketingNavClass(isHome)}>
                  Stories
                </MarketingNavLink>
                <Link
                  to="/claim"
                  className={cn(
                    marketingNavClass(isHome),
                    isHome && "font-semibold text-gold-300"
                  )}
                >
                  Claim ID
                </Link>
                <Link
                  to="/login"
                  className={cn(
                    marketingNavClass(isHome),
                    isHome && "ml-1 rounded-lg bg-white/15 px-3 hover:bg-white/25"
                  )}
                >
                  Sign In
                </Link>
              </>
            )}
            {user && canAccessDirectory && (
              <NavLink to="/directory" className={navLinkClass}>
                Directory
              </NavLink>
            )}
            {user && (
              <NavLink to="/profile" className={navLinkClass}>
                Profile
              </NavLink>
            )}
            {user && !canAccessDirectory && (
              <NavLink to="/pending" className={navLinkClass}>
                Pending
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
            {user && (
              <div className="ml-2 flex items-center gap-2 border-l border-surface-border pl-3">
                <span className="hidden text-xs font-medium uppercase tracking-wide text-brand-500 lg:inline">
                  {profile?.role?.replace("_", " ")}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </nav>

          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-lg p-2 lg:hidden",
              isHome ? "text-white hover:bg-white/10" : "text-brand-700 hover:bg-brand-50"
            )}
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <nav
            className={cn(
              "border-t px-4 py-3 lg:hidden",
              isHome ? "border-white/10 bg-brand-900/95" : "border-surface-border bg-white"
            )}
          >
            <div className="flex flex-col gap-1 text-sm">
              {!user && (
                <>
                  <MarketingNavLink
                    href="/#about"
                    className={marketingNavClass(isHome)}
                    onClick={closeMobile}
                  >
                    About
                  </MarketingNavLink>
                  <Link
                    to="/directory"
                    className={marketingNavClass(isHome)}
                    onClick={closeMobile}
                  >
                    Directory
                  </Link>
                  <MarketingNavLink
                    href="/#why-join"
                    className={marketingNavClass(isHome)}
                    onClick={closeMobile}
                  >
                    Events
                  </MarketingNavLink>
                  <MarketingNavLink
                    href="/#legacy"
                    className={marketingNavClass(isHome)}
                    onClick={closeMobile}
                  >
                    Stories
                  </MarketingNavLink>
                  <Link
                    to="/claim"
                    className={marketingNavClass(isHome)}
                    onClick={closeMobile}
                  >
                    Claim ID
                  </Link>
                  <Link
                    to="/login"
                    className={marketingNavClass(isHome)}
                    onClick={closeMobile}
                  >
                    Sign In
                  </Link>
                </>
              )}
              {user && canAccessDirectory && (
                <NavLink to="/directory" className={navLinkClass} onClick={closeMobile}>
                  Directory
                </NavLink>
              )}
              {user && (
                <NavLink to="/profile" className={navLinkClass} onClick={closeMobile}>
                  Profile
                </NavLink>
              )}
              {user && !canAccessDirectory && (
                <NavLink to="/pending" className={navLinkClass} onClick={closeMobile}>
                  Pending
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass} onClick={closeMobile}>
                  Admin
                </NavLink>
              )}
              {user && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full justify-center"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className={isHome ? undefined : "flex-1"}>
        {isFullBleed ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-8">
            <Outlet />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-brand-800 bg-brand-900 text-brand-100">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <BrandLogo size="sm" />
              <div>
                <p className="font-display text-base font-semibold text-white">
                  Ajeet Alumni Association
                </p>
                <p className="text-sm text-brand-200">Sainik School Bijapur</p>
              </div>
            </div>
            <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
              {footerLinks.map((link) =>
                "to" in link ? (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-brand-200 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <MarketingNavLink
                    key={link.label}
                    href={link.href}
                    className="text-brand-200 transition-colors hover:text-white"
                  >
                    {link.label}
                  </MarketingNavLink>
                )
              )}
            </nav>
          </div>
          <p className="mt-8 border-t border-brand-800 pt-6 text-center text-sm text-brand-300 sm:text-left">
            © Ajeet Alumni Association. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
