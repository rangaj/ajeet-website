import { Routes, Route, Navigate } from "react-router-dom";
import { AuthHashRedirect } from "@/components/auth/AuthHashRedirect";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ClaimPage } from "@/pages/ClaimPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { PendingPage } from "@/pages/PendingPage";
import { DirectoryPage } from "@/pages/DirectoryPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminQueuePage } from "@/pages/admin/AdminQueuePage";
import { AdminImportPage } from "@/pages/admin/AdminImportPage";
import { AdminGetInvolvedPage } from "@/pages/admin/AdminGetInvolvedPage";
import { ShareCardPage } from "@/pages/ShareCardPage";
import { ContactPage } from "@/pages/ContactPage";
import { EventsPage } from "@/pages/EventsPage";
import { StoriesPage } from "@/pages/StoriesPage";
import { AboutPage } from "@/pages/AboutPage";
import { PolicyDocumentView } from "@/components/content/PolicyDocumentView";
import { GET_INVOLVED_PROFILE_PATH } from "@/constants/get-involved";
import {
  directoryUsagePolicy,
  disclaimer,
  privacyPolicy,
  termsOfUse,
} from "@/content/policies";

export default function App() {
  return (
    <>
      <AuthHashRedirect />
      <ScrollToTop />
      <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="claim" element={<ClaimPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="stories" element={<StoriesPage />} />
        <Route path="card/:token" element={<ShareCardPage />} />
        <Route path="privacy" element={<PolicyDocumentView document={privacyPolicy} />} />
        <Route path="terms" element={<PolicyDocumentView document={termsOfUse} />} />
        <Route
          path="directory-usage"
          element={<PolicyDocumentView document={directoryUsagePolicy} />}
        />
        <Route path="disclaimer" element={<PolicyDocumentView document={disclaimer} />} />
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
          path="get-involved"
          element={
            <ProtectedRoute>
              <Navigate to={GET_INVOLVED_PROFILE_PATH} replace />
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
          <Route path="get-involved" element={<AdminGetInvolvedPage />} />
          <Route path="import" element={<AdminImportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}
