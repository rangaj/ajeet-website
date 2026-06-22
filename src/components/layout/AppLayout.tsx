import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-lg px-3 py-2 transition-colors",
    isActive
      ? "bg-brand-50 font-semibold text-brand-700"
      : "text-brand-800/80 hover:bg-brand-50 hover:text-brand-700"
  );

export function AppLayout() {
  const { user, isAdmin, canAccessDirectory, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <header className="sticky top-0 z-50 border-b border-surface-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-3"
            onClick={closeMobile}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
              <GraduationCap className="h-5 w-5 text-gold-400" />
            </div>
            <div className="leading-tight">
              <span className="font-display text-sm font-bold tracking-tight text-brand-900 sm:text-base">
                SSBJ Ajeet Network
              </span>
              <span className="block text-xs text-brand-600/70">Sainik School Bijapur</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            {!user && (
              <>
                <NavLink to="/claim" className={navLinkClass}>
                  Claim ID
                </NavLink>
                <NavLink to="/register" className={navLinkClass}>
                  New Ajeet Registration
                </NavLink>
                <NavLink to="/login" className={navLinkClass}>
                  Sign In
                </NavLink>
              </>
            )}
            {user && canAccessDirectory && (
              <NavLink to="/directory" className={navLinkClass}>
                Ajeet Directory
              </NavLink>
            )}
            {user && (
              <NavLink to="/profile" className={navLinkClass}>
                My Profile
              </NavLink>
            )}
            {user && !canAccessDirectory && (
              <NavLink to="/pending" className={navLinkClass}>
                Pending Approval
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
            className="inline-flex items-center justify-center rounded-lg p-2 text-brand-700 hover:bg-brand-50 md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="border-t border-surface-border bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1 text-sm">
              {!user && (
                <>
                  <NavLink to="/claim" className={navLinkClass} onClick={closeMobile}>
                    Claim ID
                  </NavLink>
                  <NavLink to="/register" className={navLinkClass} onClick={closeMobile}>
                    New Ajeet Registration
                  </NavLink>
                  <NavLink to="/login" className={navLinkClass} onClick={closeMobile}>
                    Sign In
                  </NavLink>
                </>
              )}
              {user && canAccessDirectory && (
                <NavLink to="/directory" className={navLinkClass} onClick={closeMobile}>
                  Ajeet Directory
                </NavLink>
              )}
              {user && (
                <NavLink to="/profile" className={navLinkClass} onClick={closeMobile}>
                  My Profile
                </NavLink>
              )}
              {user && !canAccessDirectory && (
                <NavLink to="/pending" className={navLinkClass} onClick={closeMobile}>
                  Pending Approval
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

      <main className="flex-1">
        {isFullBleed ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-8">
            <Outlet />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-surface-border bg-brand-900 text-brand-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display font-semibold text-white">Sainik School Bijapur</p>
            <p className="text-sm text-brand-200">Ajeet Network — Phase 1</p>
          </div>
          <p className="text-sm text-brand-300">
            Serving the Ajeet community with verified profiles and privacy-first directory access.
          </p>
        </div>
      </footer>
    </div>
  );
}
