// src/pages/BillingPage.tsx
export default function BillingPage() {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Billing</h1>
  
        {/* Current plan */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm mb-6">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium">Plan</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your current subscription and included features.
            </p>
          </div>
          <div className="px-6 py-6 grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Stat label="Plan" value="Starter" />
              <Stat label="Seats" value="1" />
              <Stat label="Billing period" value="Monthly" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Starter includes lead capture widgets, basic analytics, and one CRM integration.
              Upgrade for multi-CRM, advanced analytics, and team features.
            </div>
            <div className="flex gap-3">
              <button className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm">
                Upgrade
              </button>
              <button className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm">
                Manage payment method
              </button>
            </div>
          </div>
        </section>
  
        {/* Usage summary (placeholder) */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium">Usage</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Month-to-date usage across lead capture and analytics.
            </p>
          </div>
          <div className="px-6 py-6 grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Stat label="Leads captured" value="—" />
              <Stat label="Widgets live" value="—" />
              <Stat label="CRM syncs" value="—" />
              <Stat label="Reports generated" value="—" />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-500">
              Detailed usage reports coming soon.
            </div>
          </div>
        </section>
      </div>
    );
  }
  
  function Stat({ label, value }: { label: string; value: string }) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-lg mt-1">{value}</div>
      </div>
    );
  }
  