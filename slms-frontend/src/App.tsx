// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { CrmProvider } from "@/context/CrmProvider"; // ← add

import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import SalespeoplePage from "@/pages/SalespeoplePage";
import ReportsPage from "@/pages/ReportsPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import SettingsPage from "@/pages/SettingsPage";
import AccountPage from "@/pages/AccountPage";
import BillingPage from "@/pages/BillingPage";
import WelcomePage from "@/pages/WelcomePage";
import CurrentCRM from "@/pages/integrations/CurrentCRM";
import UpdateCRM from "@/pages/integrations/UpdateCRM";
import Notifications from "@/pages/integrations/Notifications";


export default function App() {
  return (
    <BrowserRouter>
      <CrmProvider>{/* ← wrap once so CRM is global */}
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Protected + layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/salespeople" element={<SalespeoplePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/integrations/current" element={<CurrentCRM />} />
              <Route path="/integrations/update" element={<UpdateCRM />} />
              <Route path="/integrations/notifications" element={<Notifications />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </CrmProvider>
    </BrowserRouter>
  );
}
