// src/pages/forms/StylesPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type FormStyle = "inline" | "wizard" | "modal" | "drawer";

interface StylingConfig {
  primaryColor: string;
  borderRadius: string;
  fontFamily: string;
}

interface BrandingConfig {
  showPoweredBy: boolean;
  headerText: string;
  subheaderText: string;
  submitButtonText: string;
  successMessage: string;
}

interface FormConfig {
  form_style: FormStyle;
  fields: unknown[];
  styling: StylingConfig;
  wizard: Record<string, unknown>;
  modal: Record<string, unknown>;
  drawer: Record<string, unknown>;
  branding: BrandingConfig;
}

const STYLE_OPTIONS: { id: FormStyle; name: string; description: string; available: boolean }[] = [
  { id: "inline", name: "Inline Form", description: "Standard embedded form that appears directly on the page", available: true },
  { id: "wizard", name: "Multi-Step Wizard", description: "One field at a time with progress bar and animations", available: true },
  { id: "modal", name: "Modal Popup", description: "Floating button that opens a centered popup form", available: true },
  { id: "drawer", name: "Slide-in Drawer", description: "Form slides in from the side of the screen", available: true },
];

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  try {
    const tok = localStorage.getItem("access_token");
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch { /* ignore */ }
  return fetch(url, { credentials: "include", ...init, headers });
}

export default function StylesPage() {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<FormStyle>("inline");
  const [styling, setStyling] = useState<StylingConfig>({
    primaryColor: "#2563eb",
    borderRadius: "10px",
    fontFamily: "system-ui",
  });
  const [branding, setBranding] = useState<BrandingConfig>({
    showPoweredBy: true,
    headerText: "Contact Us",
    subheaderText: "Fill out the form below",
    submitButtonText: "Submit",
    successMessage: "Thanks! We'll be in touch.",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load existing config
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await authFetch("/api/forms/config");
        if (!res.ok) throw new Error("Failed to load config");
        const data: FormConfig = await res.json();
        if (!cancelled) {
          setFormConfig(data);
          setSelectedStyle(data.form_style as FormStyle);
          if (data.styling) setStyling(data.styling);
          if (data.branding) setBranding(data.branding);
        }
      } catch (err) {
        console.error("Error loading form config:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        form_style: selectedStyle,
        fields: formConfig?.fields || [],
        styling,
        wizard: formConfig?.wizard || {},
        modal: formConfig?.modal || {},
        drawer: formConfig?.drawer || {},
        branding,
      };
      const res = await authFetch("/api/forms/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Style settings saved!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Form Style</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose how your lead capture form looks and behaves
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/forms/fields"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Fields
          </Link>
          <Link
            to="/forms/embed"
            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Get Embed Code &rarr;
          </Link>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Style Selection */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <h2 className="text-lg font-medium mb-4">Form Type</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => style.available && setSelectedStyle(style.id)}
              disabled={!style.available}
              className={`relative rounded-xl border px-4 py-4 text-left transition-colors ${
                selectedStyle === style.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                  : style.available
                  ? "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  : "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium">{style.name}</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {style.description}
                  </p>
                </div>
                {selectedStyle === style.id && (
                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {!style.available && (
                <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                  Coming Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Styling Options */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <h2 className="text-lg font-medium mb-4">Appearance</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styling.primaryColor}
                onChange={(e) => setStyling({ ...styling, primaryColor: e.target.value })}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={styling.primaryColor}
                onChange={(e) => setStyling({ ...styling, primaryColor: e.target.value })}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Border Radius</label>
            <select
              value={styling.borderRadius}
              onChange={(e) => setStyling({ ...styling, borderRadius: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="0px">None (0px)</option>
              <option value="4px">Small (4px)</option>
              <option value="8px">Medium (8px)</option>
              <option value="10px">Default (10px)</option>
              <option value="16px">Large (16px)</option>
              <option value="24px">Extra Large (24px)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Branding Options */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <h2 className="text-lg font-medium mb-4">Branding & Text</h2>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Header Text</label>
              <input
                type="text"
                value={branding.headerText}
                onChange={(e) => setBranding({ ...branding, headerText: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subheader Text</label>
              <input
                type="text"
                value={branding.subheaderText}
                onChange={(e) => setBranding({ ...branding, subheaderText: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Submit Button Text</label>
              <input
                type="text"
                value={branding.submitButtonText}
                onChange={(e) => setBranding({ ...branding, submitButtonText: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Success Message</label>
              <input
                type="text"
                value={branding.successMessage}
                onChange={(e) => setBranding({ ...branding, successMessage: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={branding.showPoweredBy}
              onChange={(e) => setBranding({ ...branding, showPoweredBy: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show "Powered by Site2CRM" badge
          </label>
        </div>
      </section>

      {/* Preview */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <h2 className="text-lg font-medium mb-4">
          Preview - {
            selectedStyle === "wizard" ? "Multi-Step Wizard" :
            selectedStyle === "modal" ? "Modal Popup" :
            selectedStyle === "drawer" ? "Slide-in Drawer" :
            "Inline Form"
          }
        </h2>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          {selectedStyle === "wizard" ? (
            /* Wizard Preview */
            <div
              className="max-w-lg mx-auto bg-white dark:bg-gray-900 p-8 shadow-lg"
              style={{ borderRadius: styling.borderRadius }}
            >
              <h3 className="text-xl font-semibold mb-1">{branding.headerText}</h3>
              <p className="text-sm text-gray-500 mb-3">{branding.subheaderText}</p>
              {/* Progress bar */}
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: "25%", backgroundColor: styling.primaryColor }}
                />
              </div>
              <p className="text-xs text-gray-400 mb-6">25%</p>

              {/* Step indicator */}
              <p className="text-xs text-gray-400 mb-2">Step 1 of 4</p>
              <h4 className="text-lg font-medium mb-4">Full Name <span className="text-red-500">*</span></h4>

              <input
                type="text"
                placeholder="Ada Lovelace"
                disabled
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-base mb-6"
                style={{ borderRadius: styling.borderRadius }}
              />

              {/* Navigation buttons */}
              <div className="flex justify-between">
                <button
                  disabled
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-400 text-sm font-medium opacity-50"
                  style={{ borderRadius: styling.borderRadius }}
                >
                  Back
                </button>
                <button
                  disabled
                  className="px-6 py-2.5 text-white text-sm font-medium"
                  style={{ backgroundColor: styling.primaryColor, borderRadius: styling.borderRadius }}
                >
                  Continue
                </button>
              </div>

              {branding.showPoweredBy && (
                <p className="text-xs text-center text-gray-400 mt-6">Powered by Site2CRM</p>
              )}
            </div>
          ) : selectedStyle === "modal" ? (
            /* Modal Preview */
            <div className="relative min-h-[400px]">
              {/* Simulated page background */}
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 opacity-50 rounded-lg" />

              {/* Floating trigger button */}
              <div className="absolute bottom-4 right-4">
                <button
                  disabled
                  className="px-5 py-3 text-white text-sm font-medium shadow-lg flex items-center gap-2"
                  style={{ backgroundColor: styling.primaryColor, borderRadius: styling.borderRadius }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Us
                </button>
              </div>

              {/* Modal overlay and content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="bg-white dark:bg-gray-900 p-6 shadow-2xl w-full max-w-md relative"
                  style={{ borderRadius: styling.borderRadius }}
                >
                  {/* Close button */}
                  <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <h3 className="text-xl font-semibold mb-1">{branding.headerText}</h3>
                  <p className="text-sm text-gray-500 mb-4">{branding.subheaderText}</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Full Name"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                      style={{ borderRadius: styling.borderRadius }}
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                      style={{ borderRadius: styling.borderRadius }}
                    />
                    <button
                      disabled
                      className="w-full py-2.5 text-white text-sm font-medium"
                      style={{ backgroundColor: styling.primaryColor, borderRadius: styling.borderRadius }}
                    >
                      {branding.submitButtonText}
                    </button>
                  </div>
                  {branding.showPoweredBy && (
                    <p className="text-xs text-center text-gray-400 mt-4">Powered by Site2CRM</p>
                  )}
                </div>
              </div>
            </div>
          ) : selectedStyle === "drawer" ? (
            /* Drawer Preview */
            <div className="relative min-h-[400px] overflow-hidden">
              {/* Simulated page background */}
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 opacity-30 rounded-lg">
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
                </div>
              </div>

              {/* Floating trigger button on left edge */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <button
                  disabled
                  className="px-3 py-4 text-white text-xs font-medium shadow-lg writing-mode-vertical"
                  style={{
                    backgroundColor: styling.primaryColor,
                    borderRadius: `0 ${styling.borderRadius} ${styling.borderRadius} 0`,
                    writingMode: "vertical-rl",
                    textOrientation: "mixed"
                  }}
                >
                  Contact
                </button>
              </div>

              {/* Drawer panel sliding in from right */}
              <div
                className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-900 shadow-2xl p-6"
                style={{ borderRadius: `${styling.borderRadius} 0 0 ${styling.borderRadius}` }}
              >
                {/* Close button */}
                <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <h3 className="text-xl font-semibold mb-1">{branding.headerText}</h3>
                <p className="text-sm text-gray-500 mb-4">{branding.subheaderText}</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                    style={{ borderRadius: styling.borderRadius }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                    style={{ borderRadius: styling.borderRadius }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                    style={{ borderRadius: styling.borderRadius }}
                  />
                  <button
                    disabled
                    className="w-full py-2.5 text-white text-sm font-medium"
                    style={{ backgroundColor: styling.primaryColor, borderRadius: styling.borderRadius }}
                  >
                    {branding.submitButtonText}
                  </button>
                </div>
                {branding.showPoweredBy && (
                  <p className="text-xs text-center text-gray-400 mt-4">Powered by Site2CRM</p>
                )}
              </div>
            </div>
          ) : (
            /* Inline Preview */
            <div
              className="max-w-md mx-auto bg-white dark:bg-gray-900 p-6 shadow-lg"
              style={{ borderRadius: styling.borderRadius }}
            >
              <h3 className="text-xl font-semibold mb-1">{branding.headerText}</h3>
              <p className="text-sm text-gray-500 mb-4">{branding.subheaderText}</p>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                    style={{ borderRadius: styling.borderRadius }}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                    style={{ borderRadius: styling.borderRadius }}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                    style={{ borderRadius: styling.borderRadius }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Company"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm"
                    style={{ borderRadius: styling.borderRadius }}
                  />
                </div>
                <button
                  disabled
                  className="w-full py-2.5 text-white text-sm font-medium"
                  style={{ backgroundColor: styling.primaryColor, borderRadius: styling.borderRadius }}
                >
                  {branding.submitButtonText}
                </button>
              </div>
              {branding.showPoweredBy && (
                <p className="text-xs text-center text-gray-400 mt-4">Powered by Site2CRM</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-indigo-600 text-white px-6 py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700"
        >
          {saving ? "Saving..." : "Save Style Settings"}
        </button>
      </div>
    </div>
  );
}
