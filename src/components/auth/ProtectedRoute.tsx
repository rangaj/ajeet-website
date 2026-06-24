import { Navigate } from "react-router-dom";
import { isRecoveryPending } from "@/lib/auth-recovery";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({
  children,
  requireDirectory = false,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireDirectory?: boolean;
  requireAdmin?: boolean;
}) {
  const { user, loading, canAccessDirectory, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-500">Loading...</div>
    );
  }

  if (isRecoveryPending()) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireDirectory && !canAccessDirectory) return <Navigate to="/pending" replace />;

  return <>{children}</>;
}
