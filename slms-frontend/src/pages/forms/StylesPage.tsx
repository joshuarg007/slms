// src/pages/forms/StylesPage.tsx
import { useEffect, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationContext";

type FormStyle = "inline" | "wizard" | "modal" | "drawer";

interface StylingConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
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

interface ThemePreset {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  preview: { bg: string; accent: string };
}

const THEME_PRESETS: ThemePreset[] = [
  { id: "modern-blue", name: "Modern Blue", primaryColor: "#2563eb", secondaryColor: "#3b82f6", backgroundColor: "#ffffff", textColor: "#1f2937", borderRadius: "12px", preview: { bg: "from-blue-500 to-indigo-600", accent: "bg-blue-500" } },
  { id: "emerald", name: "Emerald", primaryColor: "#059669", secondaryColor: "#10b981", backgroundColor: "#ffffff", textColor: "#1f2937", borderRadius: "8px", preview: { bg: "from-emerald-500 to-teal-600", accent: "bg-emerald-500" } },
  { id: "sunset", name: "Sunset", primaryColor: "#ea580c", secondaryColor: "#f97316", backgroundColor: "#fffbeb", textColor: "#78350f", borderRadius: "16px", preview: { bg: "from-orange-500 to-rose-600", accent: "bg-orange-500" } },
  { id: "purple-haze", name: "Purple Haze", primaryColor: "#7c3aed", secondaryColor: "#a855f7", backgroundColor: "#faf5ff", textColor: "#581c87", borderRadius: "20px", preview: { bg: "from-purple-500 to-pink-600", accent: "bg-purple-500" } },
  { id: "minimal", name: "Minimal", primaryColor: "#18181b", secondaryColor: "#3f3f46", backgroundColor: "#fafafa", textColor: "#18181b", borderRadius: "4px", preview: { bg: "from-zinc-700 to-zinc-900", accent: "bg-zinc-800" } },
  { id: "coral", name: "Coral", primaryColor: "#f43f5e", secondaryColor: "#fb7185", backgroundColor: "#fff1f2", textColor: "#881337", borderRadius: "10px", preview: { bg: "from-rose-500 to-pink-600", accent: "bg-rose-500" } },
  { id: "ocean", name: "Ocean", primaryColor: "#0891b2", secondaryColor: "#22d3ee", backgroundColor: "#ecfeff", textColor: "#164e63", borderRadius: "14px", preview: { bg: "from-cyan-500 to-blue-600", accent: "bg-cyan-500" } },
  { id: "forest", name: "Forest", primaryColor: "#16a34a", secondaryColor: "#22c55e", backgroundColor: "#f0fdf4", textColor: "#14532d", borderRadius: "6px", preview: { bg: "from-green-600 to-emerald-700", accent: "bg-green-600" } },
  { id: "midnight", name: "Midnight", primaryColor: "#6366f1", secondaryColor: "#818cf8", backgroundColor: "#1e1b4b", textColor: "#e0e7ff", borderRadius: "12px", preview: { bg: "from-indigo-600 to-violet-800", accent: "bg-indigo-600" } },
  { id: "warm-sand", name: "Warm Sand", primaryColor: "#d97706", secondaryColor: "#fbbf24", backgroundColor: "#fefce8", textColor: "#713f12", borderRadius: "8px", preview: { bg: "from-amber-500 to-yellow-600", accent: "bg-amber-500" } },
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
  useDocumentTitle("Form Styles");
  const { showToast } = useNotifications();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<FormStyle>("inline");
  const [styling, setStyling] = useState<StylingConfig>({
    primaryColor: "#2563eb",
    secondaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
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
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const applyPreset = (preset: ThemePreset) => {
    setStyling({
      ...styling,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      borderRadius: preset.borderRadius,
    });
    setSelectedPreset(preset.id);
  };

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
      showToast({ type: "success", title: "Style settings saved!" });
    } catch {
      showToast({ type: "error", title: "Failed to save", message: "Please try again." });
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
            to="/app/forms/fields"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Fields
          </Link>
          <Link
            to="/app/forms/embed"
            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Get Embed Code &rarr;
          </Link>
        </div>
      </header>

      {/* Branding & Text */}
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

      {/* Theme Presets */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium">Theme Presets</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Quick-start with a professionally designed theme</p>
          </div>
          {selectedPreset && (
            <button
              onClick={() => setSelectedPreset(null)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear selection
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`group relative rounded-xl border-2 p-3 text-left transition-all duration-200 ${
                selectedPreset === preset.id
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              {/* Color preview */}
              <div
                className={`h-12 rounded-lg bg-gradient-to-br ${preset.preview.bg} mb-2 shadow-sm group-hover:shadow-md transition-shadow`}
              >
                {/* Mini form preview */}
                <div className="p-2 flex flex-col gap-1">
                  <div className="h-1.5 bg-white/40 rounded-full w-3/4" />
                  <div className="h-1.5 bg-white/30 rounded-full w-1/2" />
                  <div
                    className="h-2 bg-white/60 rounded mt-1"
                    style={{ borderRadius: preset.borderRadius }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full shadow-inner"
                  style={{ backgroundColor: preset.primaryColor }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {preset.name}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {preset.borderRadius} radius
              </div>
              {selectedPreset === preset.id && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Colors */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <h2 className="text-lg font-medium mb-4">Colors</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styling.primaryColor}
                onChange={(e) => {
                  setStyling({ ...styling, primaryColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
              <input
                type="text"
                value={styling.primaryColor}
                onChange={(e) => {
                  setStyling({ ...styling, primaryColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styling.secondaryColor}
                onChange={(e) => {
                  setStyling({ ...styling, secondaryColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
              <input
                type="text"
                value={styling.secondaryColor}
                onChange={(e) => {
                  setStyling({ ...styling, secondaryColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styling.backgroundColor}
                onChange={(e) => {
                  setStyling({ ...styling, backgroundColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
              <input
                type="text"
                value={styling.backgroundColor}
                onChange={(e) => {
                  setStyling({ ...styling, backgroundColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styling.textColor}
                onChange={(e) => {
                  setStyling({ ...styling, textColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
              <input
                type="text"
                value={styling.textColor}
                onChange={(e) => {
                  setStyling({ ...styling, textColor: e.target.value });
                  setSelectedPreset(null);
                }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Typography & Shape */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <h2 className="text-lg font-medium mb-4">Typography & Shape</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Font Family</label>
            <select
              value={styling.fontFamily}
              onChange={(e) => setStyling({ ...styling, fontFamily: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <optgroup label="Sans-Serif">
                <option value="system-ui">System Default</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'Roboto', sans-serif">Roboto</option>
                <option value="'Open Sans', sans-serif">Open Sans</option>
                <option value="'Poppins', sans-serif">Poppins</option>
                <option value="'Montserrat', sans-serif">Montserrat</option>
                <option value="'Lato', sans-serif">Lato</option>
                <option value="'Source Sans Pro', sans-serif">Source Sans Pro</option>
              </optgroup>
              <optgroup label="Serif">
                <option value="'Georgia', serif">Georgia</option>
                <option value="'Playfair Display', serif">Playfair Display</option>
                <option value="'Merriweather', serif">Merriweather</option>
                <option value="'Lora', serif">Lora</option>
              </optgroup>
              <optgroup label="Monospace">
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                <option value="'Fira Code', monospace">Fira Code</option>
              </optgroup>
            </select>
            <p className="text-xs text-gray-500 mt-1">Google Fonts are loaded automatically</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Border Radius</label>
            <select
              value={styling.borderRadius}
              onChange={(e) => {
                setStyling({ ...styling, borderRadius: e.target.value });
                setSelectedPreset(null);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="0px">None (0px)</option>
              <option value="4px">Small (4px)</option>
              <option value="8px">Medium (8px)</option>
              <option value="12px">Large (12px)</option>
              <option value="16px">Extra Large (16px)</option>
              <option value="20px">Rounded (20px)</option>
              <option value="9999px">Pill (Full)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Style Selection - Form Type */}
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
            </button>
          ))}
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
              className="max-w-md mx-auto p-6 shadow-lg"
              style={{ borderRadius: styling.borderRadius, backgroundColor: styling.backgroundColor, fontFamily: styling.fontFamily }}
            >
              <h3 className="text-xl font-semibold mb-1" style={{ color: styling.textColor }}>{branding.headerText}</h3>
              <p className="text-sm mb-4" style={{ color: styling.textColor, opacity: 0.7 }}>{branding.subheaderText}</p>
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
