// src/pages/AccountPage.tsx
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Account</h1>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-medium">Profile</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Basic details for your SLMS account.
          </p>
        </div>

        <div className="px-6 py-6 grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Email</div>
            <div className="sm:col-span-2 text-sm">
              {user?.email ?? "—"}
            </div>
          </div>

          {/* Add more fields here later (name, org, roles, etc.) */}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <Link
            to="/settings"
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Settings
          </Link>
          <Link
            to="/billing"
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Billing
          </Link>
        </div>
      </div>
    </div>
  );
}
