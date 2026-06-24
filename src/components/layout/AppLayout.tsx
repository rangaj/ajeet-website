import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { PasswordSetupBanner } from "@/components/auth/PasswordSetupBanner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { BrandLockup, BrandLogo, MarketingNavBrand } from "@/components/brand/BrandLogo";
import { allowAdminDirectoryView, clearAdminDirectoryView } from "@/lib/admin-navigation";
import { BUILD_ID } from "@/lib/build-info";
import { AAA_MOTTO } from "@/constants/brand";
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

function marketingNavClass(isHome: boolean, homeScrolled: boolean) {
  if (isHome && !homeScrolled) return marketingNavOnDark;
  if (isHome && homeScrolled) return marketingNavOnDark;
  return marketingNavOnLight;
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
  const [homeScrolled, setHomeScrolled] = useState(false);

  const isHome = location.pathname === "/";
  const isFullBleed =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";

  const showPasswordBanner =
    Boolean(user) &&
    profile?.member_status === "approved" &&
    !profile.password_set_at &&
    !["/reset-password", "/forgot-password", "/login"].includes(location.pathname);

  useEffect(() => {
    if (!isHome) {
      setHomeScrolled(false);
      return;
    }
    const onScroll = () => setHomeScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const handleSignOut = async () => {
    clearAdminDirectoryView();
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  const headerClass = cn(
    "top-0 z-50 transition-all duration-300",
    isHome
      ? cn(
          "fixed inset-x-0",
          homeScrolled
            ? "border-b border-white/10 bg-brand-900/95 shadow-sm backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        )
      : "sticky border-b border-surface-border bg-white/95 backdrop-blur-md"
  );

  const openDirectory = () => {
    allowAdminDirectoryView();
    closeMobile();
  };

  const footerSections = [
    {
      title: "About",
      links: [{ label: "About AAA", to: "/about" }],
    },
    {
      title: "Platform",
      links: [
        { label: "Directory", to: "/directory" },
        { label: "Claim Profile", to: "/claim" },
        { label: "Register", to: "/register" },
        { label: "Contact Us", to: "/contact" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "Events", to: "/events" },
        { label: "Stories", to: "/stories" },
      ],
    },
    {
      title: "Listen & Watch",
      links: [
        {
          label: "YouTube",
          href: "https://www.youtube.com/@ajeetalumniassociation",
        },
        {
          label: "The AEiF Podcast",
          href: "https://open.spotify.com/show/5MxQBL9UwP4IHcwcun3FZ3",
        },
        {
          label: "The AKF Podcast",
          href: "https://open.spotify.com/show/1XPNpzdwDUJf0KICAlGkOE",
        },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Terms of Use", to: "/terms" },
        { label: "Directory Usage Policy", to: "/directory-usage" },
      ],
    },
  ] as const;

  const navClass = marketingNavClass(isHome, homeScrolled);

  return (
    <div className={cn("flex min-h-screen flex-col", isHome ? "bg-warm-white" : "bg-surface-muted")}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div onClick={closeMobile}>
            {!user ? (
              <MarketingNavBrand inverse={isHome} />
            ) : (
              <BrandLockup size="header" asLink />
            )}
          </div>

          <nav className="hidden items-center gap-0.5 text-sm lg:flex">
            {!user && (
              <>
                <Link to="/about" className={navClass}>
                  About
                </Link>
                <Link to="/directory" className={navClass}>
                  Directory
                </Link>
                <Link to="/events" className={navClass}>
                  Events
                </Link>
                <Link to="/stories" className={navClass}>
                  Stories
                </Link>
                <Link
                  to="/claim"
                  className="rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-brand-900 transition-colors hover:bg-gold-400"
                >
                  Claim ID
                </Link>
                <Link to="/login" className={navClass}>
                  Sign In
                </Link>
              </>
            )}
            {user && canAccessDirectory && (
              <NavLink
                to="/directory"
                className={navLinkClass}
                onClick={() => {
                  if (isAdmin) allowAdminDirectoryView();
                }}
              >
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
              isHome ? "border-white/10 bg-brand-900/98 backdrop-blur-md" : "border-surface-border bg-white"
            )}
          >
            <div className="flex flex-col gap-1 text-sm">
              {!user && (
                <>
                  <Link to="/about" className={navClass} onClick={closeMobile}>
                    About
                  </Link>
                  <Link to="/directory" className={navClass} onClick={closeMobile}>
                    Directory
                  </Link>
                  <Link to="/events" className={navClass} onClick={closeMobile}>
                    Events
                  </Link>
                  <Link to="/stories" className={navClass} onClick={closeMobile}>
                    Stories
                  </Link>
                  <Link
                    to="/claim"
                    className="mt-1 rounded-lg bg-gold-500 px-3 py-2.5 text-center font-semibold text-brand-900"
                    onClick={closeMobile}
                  >
                    Claim ID
                  </Link>
                  <Link to="/login" className={navClass} onClick={closeMobile}>
                    Sign In
                  </Link>
                </>
              )}
              {user && canAccessDirectory && (
                <NavLink to="/directory" className={navLinkClass} onClick={openDirectory}>
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
        {showPasswordBanner && <PasswordSetupBanner />}
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
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
              {footerSections.map((section) => (
                <div key={section.title}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
                    {section.title}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        {"to" in link ? (
                          <Link
                            to={link.to}
                            className="text-brand-200 transition-colors hover:text-white"
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-200 transition-colors hover:text-white"
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 space-y-2 border-t border-brand-800 pt-6 text-center text-sm text-brand-300 sm:text-left">
            <p>Managed by Ajeets Alumni Association (AAA)</p>
            <p className="font-display italic text-gold-300">{AAA_MOTTO}</p>
            <p className="text-brand-400">Official alumni platform of the Ajeet community.</p>
            <p className="pt-2">© Ajeet Alumni Association. All Rights Reserved.</p>
            <span className="block text-xs text-brand-400/80">Build {BUILD_ID}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
