// src/App.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CrmProvider } from "@/context/CrmProvider";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastContainer } from "@/components/ToastContainer";
import { TutorialProvider, TutorialKeyboardHandler } from "@/components/TutorialSystem";
import { AccessibilityProvider } from "@/components/Accessibility";

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Loading...</span>
      </div>
    </div>
  );
}

// Auth pages - keep these sync for fast auth flow
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

// Public marketing pages - lazy load for code splitting
const HomePage = lazy(() => import("@/pages/public/HomePage"));
const PricingPage = lazy(() => import("@/pages/public/PricingPage"));
const FeaturesPage = lazy(() => import("@/pages/public/FeaturesPage"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const TermsPage = lazy(() => import("@/pages/public/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/public/PrivacyPage"));
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage"));

// Protected app pages - lazy load for code splitting
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const LeadsPage = lazy(() => import("@/pages/LeadsPage"));
const SalespeoplePage = lazy(() => import("@/pages/SalespeoplePage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const IntegrationsPage = lazy(() => import("@/pages/IntegrationsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const BillingPage = lazy(() => import("@/pages/BillingPage"));
const CurrentCRM = lazy(() => import("@/pages/integrations/CurrentCRM"));
const UpdateCRM = lazy(() => import("@/pages/integrations/UpdateCRM"));
const Notifications = lazy(() => import("@/pages/integrations/Notifications"));
const FieldsPage = lazy(() => import("@/pages/forms/FieldsPage"));
const StylesPage = lazy(() => import("@/pages/forms/StylesPage"));
const EmbedPage = lazy(() => import("@/pages/forms/EmbedPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const SalesDashboardPage = lazy(() => import("@/pages/SalesDashboardPage"));
const TeamKPIPage = lazy(() => import("@/pages/TeamKPIPage"));
const RecommendationsPage = lazy(() => import("@/pages/RecommendationsPage"));
const LeadScoringPage = lazy(() => import("@/pages/LeadScoringPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const AutomationPage = lazy(() => import("@/pages/AutomationPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
      <BrowserRouter>
        <ScrollToTop />
        <CookieConsent />
        <NotificationProvider>
        <GamificationProvider>
        <CrmProvider>
          <ToastContainer />
          <Suspense fallback={<PageLoader />}>
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
            <Route element={<TutorialProvider><TutorialKeyboardHandler /><AppLayout /></TutorialProvider>}>
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
              <Route path="sales-dashboard" element={<SalesDashboardPage />} />
              <Route path="team-kpi" element={<TeamKPIPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="lead-scoring" element={<LeadScoringPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="automation" element={<AutomationPage />} />
            </Route>
          </Route>

          </Routes>
          </Suspense>
        </CrmProvider>
        </GamificationProvider>
        </NotificationProvider>
      </BrowserRouter>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
