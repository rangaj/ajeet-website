import { Link, Outlet, NavLink } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Upload, ClipboardList, Users } from "lucide-react";

export function AdminLayout() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Console</h1>
      <div className="flex flex-wrap gap-2">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${isActive ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`
          }
        >
          <ClipboardList className="h-4 w-4" /> Review Queue
        </NavLink>
        <NavLink
          to="/admin/import"
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${isActive ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`
          }
        >
          <Upload className="h-4 w-4" /> Data Import
        </NavLink>
        <Link
          to="/directory"
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          <Users className="h-4 w-4" /> Directory
        </Link>
      </div>
      <Card>
        <Outlet />
      </Card>
    </div>
  );
}
