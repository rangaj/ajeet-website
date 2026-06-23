import { Routes, Route, Navigate } from "react-router-dom";
import { AuthHashRedirect } from "@/components/auth/AuthHashRedirect";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ClaimPage } from "@/pages/ClaimPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { PendingPage } from "@/pages/PendingPage";
import { DirectoryPage } from "@/pages/DirectoryPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminQueuePage } from "@/pages/admin/AdminQueuePage";
import { AdminImportPage } from "@/pages/admin/AdminImportPage";

export default function App() {
  return (
    <>
      <AuthHashRedirect />
      <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="claim" element={<ClaimPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="pending"
          element={
            <ProtectedRoute>
              <PendingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="directory"
          element={
            <ProtectedRoute requireDirectory>
              <DirectoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminQueuePage />} />
          <Route path="import" element={<AdminImportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}
