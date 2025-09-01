// src/pages/IntegrationsPage.tsx
export default function IntegrationsPage() {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Integrations</h1>
  
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-medium">CRM Connections</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connect SLMS to your CRM. HubSpot works today; Pipedrive, Nutshell, and Salesforce are on the roadmap.
            </p>
          </div>
  
          <div className="px-6 py-6 grid gap-4">
            {/* HubSpot (enabled) */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 p-4">
              <div className="font-medium">HubSpot</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Private app token; salespeople stats sync and lead creation.
              </div>
              <div className="mt-3 flex gap-2">
                <button className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm">
                  Configure
                </button>
                <button className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm">
                  Test Connection
                </button>
              </div>
            </div>
  
            {/* Future integrations (disabled) */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/20 p-4 opacity-60">
              <div className="font-medium">Pipedrive</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Coming soon</div>
              <div className="mt-3">
                <button disabled className="rounded-md border px-4 py-2 text-sm opacity-60 cursor-not-allowed">
                  Configure
                </button>
              </div>
            </div>
  
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/20 p-4 opacity-60">
              <div className="font-medium">Nutshell CRM</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Coming soon</div>
              <div className="mt-3">
                <button disabled className="rounded-md border px-4 py-2 text-sm opacity-60 cursor-not-allowed">
                  Configure
                </button>
              </div>
            </div>
  
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/20 p-4 opacity-60">
              <div className="font-medium">Salesforce</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Coming soon</div>
              <div className="mt-3">
                <button disabled className="rounded-md border px-4 py-2 text-sm opacity-60 cursor-not-allowed">
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  