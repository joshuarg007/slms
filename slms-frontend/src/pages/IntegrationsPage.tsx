// src/pages/IntegrationsPage.tsx
import { useEffect, useState } from "react";

type CRM = "hubspot" | "pipedrive" | "salesforce" | "nutshell";

const STORAGE_KEY = "slms.activeCRM";
const CRM_OPTIONS: { id: CRM; label: string }[] = [
  { id: "hubspot", label: "HubSpot" },
  { id: "pipedrive", label: "Pipedrive" },
  { id: "salesforce", label: "Salesforce" },
  { id: "nutshell", label: "Nutshell CRM" },
];

export default function IntegrationsPage() {
  const [activeCRM, setActiveCRM] = useState<CRM>("hubspot");
  const [editing, setEditing] = useState<CRM>("hubspot");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as CRM | null) ?? "hubspot";
    setActiveCRM(stored);
    setEditing(stored);
  }, []);

  function onSelect(next: CRM) {
    setEditing(next);
  }

  async function onSave() {
    if (editing === activeCRM) {
      setMsg("No changes to save.");
      return;
    }

    const confirmed = window.confirm(
      `Switch active CRM from ${labelOf(activeCRM)} to ${labelOf(editing)}?\n\n` +
      "This will change where new leads and salesperson stats are pulled from. " +
      "You can switch back any time in Integrations."
    );
    if (!confirmed) {
      // revert the selector back to the persisted value
      setEditing(activeCRM);
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      // For now we persist locally. Later: call your backend to save per-organization:
      // await fetch(`${apiBase()}/integrations/crm/active`, { method: 'POST', headers: {...}, body: JSON.stringify({ provider: editing }) })
      localStorage.setItem(STORAGE_KEY, editing);
      setActiveCRM(editing);
      setMsg(`Active CRM set to ${labelOf(editing)}.`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to save selection");
      setEditing(activeCRM); // roll back UI
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <button
          onClick={onSave}
          disabled={saving || editing === activeCRM}
          className="rounded-md bg-indigo-600 text-white px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      {msg && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {msg}
        </div>
      )}

      {/* Active CRM card */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-medium">Active CRM</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose the primary CRM for lead capture and salesperson analytics. You’ll be asked to confirm before switching.
          </p>
        </div>

        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {CRM_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors
                ${editing === opt.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
              >
                <input
                  type="radio"
                  name="crm"
                  value={opt.id}
                  checked={editing === opt.id}
                  onChange={() => onSelect(opt.id)}
                  className="h-4 w-4"
                />
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Current: <span className="font-medium">{labelOf(activeCRM)}</span></p>
            <p className="mt-1">
              Make sure you’ve added API credentials for the selected CRM in the sections below.
            </p>
          </div>
        </div>
      </section>

      {/* Credential stubs (disabled/future-ready) */}
      <div className="mt-6 grid gap-6">
        <ProviderCard
          title="HubSpot"
          enabled={activeCRM === "hubspot"}
          docs="https://developers.hubspot.com/docs/api/private-apps"
          hint="Private app token with: crm.objects.owners.read, crm.objects.deals.read, engagements read scopes."
        />
        <ProviderCard
          title="Pipedrive"
          enabled={activeCRM === "pipedrive"}
          docs="https://pipedrive.readme.io/docs/marketplace-and-api"
          hint="Use a company-wide API token for now; OAuth coming soon."
        />
        <ProviderCard
          title="Salesforce"
          enabled={activeCRM === "salesforce"}
          docs="https://developer.salesforce.com/docs/"
          hint="Connected App (OAuth 2.0); we’ll guide you through in a future update."
        />
        <ProviderCard
          title="Nutshell CRM"
          enabled={activeCRM === "nutshell"}
          docs="https://developers.nutshell.com/"
          hint="API key support planned."
        />
      </div>
    </div>
  );
}

function labelOf(id: CRM) {
  return CRM_OPTIONS.find(o => o.id === id)?.label || id;
}

function ProviderCard({
  title,
  enabled,
  docs,
  hint,
}: {
  title: string;
  enabled: boolean;
  docs: string;
  hint: string;
}) {
  return (
    <section
      className={`rounded-2xl border px-5 py-4 ${
        enabled
          ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        {!enabled && (
          <span className="text-xs rounded-full border px-2 py-0.5 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
            Inactive
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{hint}</p>
      <div className="mt-3">
        <a
          href={docs}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-indigo-600 hover:underline"
        >
          Docs
        </a>
      </div>
    </section>
  );
}
