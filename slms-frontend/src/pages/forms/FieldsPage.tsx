// src/pages/forms/FieldsPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

interface FieldConfig {
  key: string;
  enabled: boolean;
  required: boolean;
  label: string;
  placeholder?: string;
  field_type: "text" | "email" | "tel" | "textarea" | "select" | "multi";
  options?: string[];
}

interface FormConfig {
  form_style: string;
  fields: FieldConfig[];
  styling: Record<string, string>;
  wizard: Record<string, unknown>;
  modal: Record<string, unknown>;
  drawer: Record<string, unknown>;
  branding: Record<string, string>;
}

// Field type icons and metadata
const FIELD_TYPE_META: Record<string, { icon: JSX.Element; label: string; color: string }> = {
  text: {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />,
    label: "Text",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  email: {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    label: "Email",
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  tel: {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
    label: "Phone",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  textarea: {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h10" />,
    label: "Long Text",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  select: {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />,
    label: "Dropdown",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  },
  multi: {
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    label: "Multi-Select",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  },
};

const DEFAULT_FIELDS: FieldConfig[] = [
  { key: "name", enabled: true, required: true, label: "Full Name", placeholder: "Ada Lovelace", field_type: "text" },
  { key: "email", enabled: true, required: true, label: "Email", placeholder: "you@domain.com", field_type: "email" },
  { key: "phone", enabled: true, required: false, label: "Phone", placeholder: "+1 555 555 5555", field_type: "tel" },
  { key: "company", enabled: true, required: false, label: "Company", placeholder: "Acme Inc.", field_type: "text" },
  { key: "job_title", enabled: false, required: false, label: "Job Title", placeholder: "Marketing Manager", field_type: "text" },
  { key: "website", enabled: false, required: false, label: "Website", placeholder: "https://example.com", field_type: "text" },
  { key: "budget", enabled: false, required: false, label: "Budget Range", placeholder: "", field_type: "select", options: ["Under $5k", "$5k - $25k", "$25k - $100k", "$100k+"] },
  { key: "timeline", enabled: false, required: false, label: "Timeline", placeholder: "", field_type: "select", options: ["Immediately", "1-3 months", "3-6 months", "6+ months", "Just exploring"] },
  { key: "team_size", enabled: false, required: false, label: "Team Size", placeholder: "", field_type: "select", options: ["Just me", "2-10", "11-50", "51-200", "200+"] },
  { key: "industry", enabled: false, required: false, label: "Industry", placeholder: "", field_type: "select", options: ["Technology", "Healthcare", "Finance", "Retail", "Manufacturing", "Education", "Other"] },
  { key: "services", enabled: false, required: false, label: "Services Interested In", placeholder: "", field_type: "multi", options: ["Web Development", "Mobile Apps", "UI/UX Design", "Consulting", "Support"] },
  { key: "source", enabled: false, required: false, label: "How did you hear about us?", placeholder: "", field_type: "select", options: ["Google Search", "Social Media", "Referral", "Advertisement", "Other"] },
  { key: "message", enabled: true, required: false, label: "Message", placeholder: "Tell us about your project...", field_type: "textarea" },
];

// Fields that are always required and cannot be toggled
const ALWAYS_REQUIRED_FIELDS = ["name"];

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  try {
    const tok = localStorage.getItem("access_token");
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch { /* ignore */ }
  return fetch(url, { credentials: "include", ...init, headers });
}

export default function FieldsPage() {
  const [fields, setFields] = useState<FieldConfig[]>(DEFAULT_FIELDS);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldConfig["field_type"]>("text");
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

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
          // Merge saved fields with defaults to include new built-in fields
          if (data.fields.length > 0) {
            const savedKeys = new Set(data.fields.map(f => f.key));
            const newDefaults = DEFAULT_FIELDS.filter(f => !savedKeys.has(f.key));
            setFields([...data.fields, ...newDefaults]);
          } else {
            setFields(DEFAULT_FIELDS);
          }
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

  // Auto-dismiss success message
  useEffect(() => {
    if (message?.type === "success") {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const toggleField = useCallback((key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  }, []);

  const toggleRequired = useCallback((key: string) => {
    if (ALWAYS_REQUIRED_FIELDS.includes(key)) return;
    setFields(prev => prev.map(f => f.key === key ? { ...f, required: !f.required } : f));
  }, []);

  const updateField = useCallback((key: string, updates: Partial<FieldConfig>) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, ...updates } : f));
  }, []);

  const addCustomField = useCallback(() => {
    if (!newFieldLabel.trim()) return;
    const customKey = `custom_${Date.now()}`;
    const newField: FieldConfig = {
      key: customKey,
      enabled: true,
      required: false,
      label: newFieldLabel.trim(),
      placeholder: "",
      field_type: newFieldType,
      options: newFieldType === "select" || newFieldType === "multi" ? ["Option 1", "Option 2", "Option 3"] : undefined,
    };
    setFields(prev => [...prev, newField]);
    setNewFieldLabel("");
    setNewFieldType("text");
    setExpandedField(customKey);
  }, [newFieldLabel, newFieldType]);

  const removeField = useCallback((key: string) => {
    if (!key.startsWith("custom_")) return;
    setFields(prev => prev.filter(f => f.key !== key));
    if (expandedField === key) setExpandedField(null);
  }, [expandedField]);

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    dragCounter.current++;
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      setFields(prev => {
        const newFields = [...prev];
        const [removed] = newFields.splice(draggedIndex, 1);
        newFields.splice(dropIndex, 0, removed);
        return newFields;
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        form_style: formConfig?.form_style || "inline",
        fields,
        styling: formConfig?.styling,
        wizard: formConfig?.wizard,
        modal: formConfig?.modal,
        drawer: formConfig?.drawer,
        branding: formConfig?.branding,
      };
      const res = await authFetch("/api/forms/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Fields saved successfully!" });
    } catch {
      setMessage({ type: "error", text: "Failed to save fields. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = fields.filter(f => f.enabled).length;
  const requiredCount = fields.filter(f => f.enabled && f.required).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading fields...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Form Fields</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure which fields appear on your lead capture form
          </p>
          <div className="flex items-center gap-4 mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {enabledCount} active
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {requiredCount} required
            </span>
          </div>
        </div>
        <Link
          to="/forms/styles"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
        >
          Next: Choose Style
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </header>

      {/* Message Toast */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            message.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {message.type === "success" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            )}
          </svg>
          {message.text}
        </div>
      )}

      {/* Fields List */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Drag to reorder fields
          </p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {fields.map((field, index) => {
            const meta = FIELD_TYPE_META[field.field_type] || FIELD_TYPE_META.text;
            const isExpanded = expandedField === field.key;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={field.key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`transition-all ${
                  isDragging ? "opacity-50 bg-gray-50 dark:bg-gray-800" : ""
                } ${isDragOver ? "border-t-2 border-indigo-500" : ""}`}
              >
                <div
                  className={`px-5 py-4 flex items-center gap-4 cursor-grab active:cursor-grabbing ${
                    !field.enabled ? "opacity-50" : ""
                  }`}
                >
                  {/* Drag handle */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>

                  {/* Enable toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleField(field.key); }}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      field.enabled ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                        field.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>

                  {/* Field icon & type */}
                  <div className={`flex-shrink-0 p-2 rounded-lg ${meta.color}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {meta.icon}
                    </svg>
                  </div>

                  {/* Field info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Required
                        </span>
                      )}
                      {field.key.startsWith("custom_") && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Custom
                        </span>
                      )}
                    </div>
                    {field.placeholder && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {field.placeholder}
                      </p>
                    )}
                  </div>

                  {/* Type badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${meta.color}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {meta.icon}
                    </svg>
                    {meta.label}
                  </span>

                  {/* Expand/Edit button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedField(isExpanded ? null : field.key); }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded edit section */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Label */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Label
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.key, { label: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

                      {/* Placeholder */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(field.key, { placeholder: e.target.value })}
                          placeholder="Placeholder text..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

                      {/* Required toggle */}
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={() => toggleRequired(field.key)}
                            disabled={ALWAYS_REQUIRED_FIELDS.includes(field.key)}
                            className="sr-only peer"
                          />
                          <div className={`w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 ${
                            ALWAYS_REQUIRED_FIELDS.includes(field.key) ? "opacity-60 cursor-not-allowed" : ""
                          }`} />
                        </label>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Required field
                          {ALWAYS_REQUIRED_FIELDS.includes(field.key) && (
                            <span className="ml-1 text-xs text-gray-500">(always)</span>
                          )}
                        </span>
                      </div>

                      {/* Field type (for custom fields) */}
                      {field.key.startsWith("custom_") && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Field Type
                          </label>
                          <select
                            value={field.field_type}
                            onChange={(e) => updateField(field.key, {
                              field_type: e.target.value as FieldConfig["field_type"],
                              options: ["select", "multi"].includes(e.target.value) && !field.options ? ["Option 1", "Option 2", "Option 3"] : field.options,
                            })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="tel">Phone</option>
                            <option value="textarea">Long Text</option>
                            <option value="select">Dropdown</option>
                            <option value="multi">Multi-Select</option>
                          </select>
                        </div>
                      )}

                      {/* Options editor for select/multi fields */}
                      {(field.field_type === "select" || field.field_type === "multi") && (
                        <div className="col-span-full">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Options (one per line)
                          </label>
                          <textarea
                            value={(field.options || []).join("\n")}
                            onChange={(e) => updateField(field.key, { options: e.target.value.split("\n").filter(o => o.trim()) })}
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}
                    </div>

                    {/* Delete button for custom fields */}
                    {field.key.startsWith("custom_") && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => removeField(field.key)}
                          className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete this field
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Add custom field */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Custom Field
          </h3>
          <p className="text-sm text-indigo-100 mt-1">Create your own field to capture additional information</p>
        </div>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="Field label (e.g., 'Project Description')"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              onKeyDown={(e) => e.key === "Enter" && addCustomField()}
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as FieldConfig["field_type"])}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="tel">Phone</option>
              <option value="textarea">Long Text</option>
              <option value="select">Dropdown</option>
              <option value="multi">Multi-Select</option>
            </select>
            <button
              onClick={addCustomField}
              disabled={!newFieldLabel.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>
      </section>

      {/* Save button - sticky footer */}
      <div className="sticky bottom-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-6 py-3 text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Fields
            </>
          )}
        </button>
      </div>
    </div>
  );
}
