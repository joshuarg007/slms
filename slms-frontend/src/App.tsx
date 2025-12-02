// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CrmProvider } from "@/context/CrmProvider";

// Auth pages
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

// Public marketing pages
import HomePage from "@/pages/public/HomePage";
import PricingPage from "@/pages/public/PricingPage";
import FeaturesPage from "@/pages/public/FeaturesPage";
import AboutPage from "@/pages/public/AboutPage";
import ContactPage from "@/pages/public/ContactPage";
import TermsPage from "@/pages/public/TermsPage";
import PrivacyPage from "@/pages/public/PrivacyPage";
import NotFoundPage from "@/pages/public/NotFoundPage";

// Protected app pages
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import SalespeoplePage from "@/pages/SalespeoplePage";
import ReportsPage from "@/pages/ReportsPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import SettingsPage from "@/pages/SettingsPage";
import AccountPage from "@/pages/AccountPage";
import UsersPage from "@/pages/UsersPage";
import BillingPage from "@/pages/BillingPage";
import CurrentCRM from "@/pages/integrations/CurrentCRM";
import UpdateCRM from "@/pages/integrations/UpdateCRM";
import Notifications from "@/pages/integrations/Notifications";
import FieldsPage from "@/pages/forms/FieldsPage";
import StylesPage from "@/pages/forms/StylesPage";
import EmbedPage from "@/pages/forms/EmbedPage";
import ChatPage from "@/pages/ChatPage";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <CookieConsent />
        <CrmProvider>
          <Routes>
          {/* Public Marketing Site */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Auth Pages (no layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected App Routes */}
          <Route path="/app" element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="salespeople" element={<SalespeoplePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="integrations/current" element={<CurrentCRM />} />
              <Route path="integrations/update" element={<UpdateCRM />} />
              <Route path="integrations/notifications" element={<Notifications />} />
              <Route path="forms/fields" element={<FieldsPage />} />
              <Route path="forms/styles" element={<StylesPage />} />
              <Route path="forms/embed" element={<EmbedPage />} />
              <Route path="chat" element={<ChatPage />} />
            </Route>
          </Route>

          </Routes>
        </CrmProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
