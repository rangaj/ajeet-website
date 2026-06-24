import { Link, NavLink, Outlet } from "react-router-dom";
import { ClipboardList, Upload, Users } from "lucide-react";
import { allowAdminDirectoryView } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";

const ADMIN_TABS = [
  { to: "/admin", end: true, label: "Review Queue", icon: ClipboardList },
  { to: "/admin/import", label: "Data Import", icon: Upload },
] as const;

function AdminNavChip({
  to,
  end,
  label,
  icon: Icon,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: typeof ClipboardList;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
          isActive
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-surface-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"
        )
      }
    >
      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      {label}
    </NavLink>
  );
}

export function AdminLayout() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Admin Console
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Review registrations, resolve claims, and manage alumni data.
        </p>
      </header>

      <nav className="flex flex-wrap items-center gap-2" aria-label="Admin sections">
        {ADMIN_TABS.map((tab) => (
          <AdminNavChip key={tab.to} {...tab} />
        ))}
        <Link
          to="/directory"
          onClick={allowAdminDirectoryView}
          className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 sm:text-sm"
        >
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          Directory
        </Link>
      </nav>

      <Outlet />
    </div>
  );
}
