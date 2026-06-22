import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function AppLayout() {
  const { user, isAdmin, canAccessDirectory, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand-900">
            <GraduationCap className="h-6 w-6 text-brand-600" />
            Alumni Directory
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {!user && (
              <>
                <NavLink to="/login" className="text-slate-600 hover:text-brand-600">Login</NavLink>
                <NavLink to="/claim" className="text-slate-600 hover:text-brand-600">Claim Profile</NavLink>
                <NavLink to="/register" className="text-slate-600 hover:text-brand-600">Register</NavLink>
              </>
            )}
            {user && canAccessDirectory && (
              <NavLink
                to="/directory"
                className={({ isActive }) =>
                  isActive ? "font-medium text-brand-600" : "text-slate-600 hover:text-brand-600"
                }
              >
                Directory
              </NavLink>
            )}
            {user && (
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  isActive ? "font-medium text-brand-600" : "text-slate-600 hover:text-brand-600"
                }
              >
                My Profile
              </NavLink>
            )}
            {user && !canAccessDirectory && (
              <NavLink to="/pending" className="text-amber-700 hover:text-amber-800">
                Pending Approval
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  isActive ? "font-medium text-brand-600" : "text-slate-600 hover:text-brand-600"
                }
              >
                Admin
              </NavLink>
            )}
            {user && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <span className="hidden text-slate-500 sm:inline">{profile?.role}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
