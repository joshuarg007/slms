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

// Loading fallback component - accessible skeleton loader
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Loading page content">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
        <span className="sr-only">Please wait while the page content loads</span>
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
const HelpPage = lazy(() => import("@/pages/public/HelpPage"));
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
// const ChatPage = lazy(() => import("@/pages/ChatPage")); // AI features disabled
const SalesDashboardPage = lazy(() => import("@/pages/SalesDashboardPage"));
const TeamKPIPage = lazy(() => import("@/pages/TeamKPIPage"));
const RecommendationsPage = lazy(() => import("@/pages/RecommendationsPage"));
const LeadScoringPage = lazy(() => import("@/pages/LeadScoringPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const AutomationPage = lazy(() => import("@/pages/AutomationPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));

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
            <Route path="/help" element={<HelpPage />} />
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
            {/* Onboarding page - outside AppLayout */}
            <Route path="onboarding" element={<OnboardingPage />} />

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
              {/* <Route path="chat" element={<ChatPage />} /> AI features disabled */}
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
