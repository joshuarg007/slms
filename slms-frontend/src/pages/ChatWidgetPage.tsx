// src/pages/ChatWidgetPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  getChatWidgetConfigs,
  createChatWidgetConfig,
  updateChatWidgetConfig,
  deleteChatWidgetConfig,
  getChatWidgetEmbedCode,
  getChatWidgetConversations,
  type ChatWidgetConfig,
  type ChatWidgetEmbedCode,
  type ChatWidgetConversation,
} from "@/utils/api";
import { FriendlyError } from "@/components/FriendlyError";

const TONES = [
  { value: "friendly", label: "Friendly", desc: "Warm and approachable, like a helpful colleague" },
  { value: "professional", label: "Professional", desc: "Polished and courteous, businesslike" },
  { value: "casual", label: "Casual", desc: "Relaxed and conversational" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
];

const EMPTY_FORM: Omit<ChatWidgetConfig, 'id' | 'widget_key' | 'created_at' | 'updated_at'> = {
  business_name: "",
  business_description: "",
  services: "",
  restrictions: "",
  cta: "Free 15-minute consultation",
  contact_email: "",
  tone: "friendly",
  extra_context: "",
  primary_color: "#4f46e5",
  widget_position: "bottom-right",
  is_active: true,
};

export default function ChatWidgetPage() {
  useDocumentTitle("AI Chat Widgets");

  const [view, setView] = useState<"list" | "form" | "embed" | "conversations">("list");
  const [widgets, setWidgets] = useState<ChatWidgetConfig[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<ChatWidgetConfig | null>(null);
  const [embedCode, setEmbedCode] = useState<ChatWidgetEmbedCode | null>(null);
  const [conversations, setConversations] = useState<ChatWidgetConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);

  // Load widgets list
  const loadWidgets = useCallback(async () => {
    try {
      const data = await getChatWidgetConfigs();
      setWidgets(data);
    } catch (err) {
      console.error("Failed to load widgets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  // Load embed code for selected widget
  async function loadEmbedCode(widgetKey: string) {
    try {
      const data = await getChatWidgetEmbedCode(widgetKey);
      setEmbedCode(data);
    } catch (err) {
      console.error("Failed to load embed code:", err);
    }
  }

  // Load conversations for selected widget
  async function loadConversations(widgetKey: string) {
    try {
      const data = await getChatWidgetConversations(50, widgetKey);
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }

  const handleNewWidget = () => {
    setForm(EMPTY_FORM);
    setSelectedWidget(null);
    setIsEditing(false);
    setError(null);
    setView("form");
  };

  const handleEditWidget = (widget: ChatWidgetConfig) => {
    setForm({
      business_name: widget.business_name,
      business_description: widget.business_description,
      services: widget.services,
      restrictions: widget.restrictions || "",
      cta: widget.cta,
      contact_email: widget.contact_email,
      tone: widget.tone,
      extra_context: widget.extra_context || "",
      primary_color: widget.primary_color,
      widget_position: widget.widget_position,
      is_active: widget.is_active,
    });
    setSelectedWidget(widget);
    setIsEditing(true);
    setError(null);
    setView("form");
  };

  const handleViewEmbed = (widget: ChatWidgetConfig) => {
    setSelectedWidget(widget);
    if (widget.widget_key) {
      loadEmbedCode(widget.widget_key);
    }
    setView("embed");
  };

  const handleViewConversations = (widget: ChatWidgetConfig) => {
    setSelectedWidget(widget);
    if (widget.widget_key) {
      loadConversations(widget.widget_key);
    }
    setView("conversations");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEditing && selectedWidget?.widget_key) {
        await updateChatWidgetConfig(selectedWidget.widget_key, form);
      } else {
        await createChatWidgetConfig(form);
      }
      await loadWidgets();
      setView("list");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (widget: ChatWidgetConfig) => {
    if (!widget.widget_key) return;
    if (!confirm(`Delete widget "${widget.business_name}"? This cannot be undone.`)) return;

    try {
      await deleteChatWidgetConfig(widget.widget_key);
      await loadWidgets();
    } catch (err) {
      console.error("Failed to delete widget:", err);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Chat Widgets</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Add AI-powered chat assistants to your websites that capture leads automatically
          </p>
        </div>
        {view === "list" && (
          <button
            onClick={handleNewWidget}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Widget
          </button>
        )}
        {view !== "list" && (
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to List
          </button>
        )}
      </header>

      {/* List View */}
      {view === "list" && (
        <div className="space-y-4">
          {widgets.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="font-medium text-gray-900 dark:text-gray-100">No chat widgets yet</p>
              <p className="text-sm mt-1 text-gray-500">Create your first AI chat widget to start capturing leads</p>
              <button
                onClick={handleNewWidget}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                Create Widget
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: widget.primary_color }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {widget.business_name}
                          </h3>
                          {widget.is_active ? (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {widget.business_description}
                        </p>
                        {widget.widget_key && (
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            {widget.widget_key}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewConversations(widget)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="View conversations"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleViewEmbed(widget)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Get embed code"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditWidget(widget)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Edit widget"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(widget)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete widget"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form View */}
      {view === "form" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <FriendlyError
              error={error}
              message="There was a problem saving your configuration."
              onRetry={() => setError(null)}
            />
          )}

          {/* Business Information */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Business Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Acme Corp"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Description *
              </label>
              <textarea
                value={form.business_description}
                onChange={(e) => setForm({ ...form, business_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={3}
                placeholder="We help businesses grow through innovative digital marketing solutions..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">Describe what your business does</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Services/Products *
              </label>
              <textarea
                value={form.services}
                onChange={(e) => setForm({ ...form, services: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={3}
                placeholder="- Website design&#10;- SEO optimization&#10;- Social media management"
                required
              />
              <p className="mt-1 text-xs text-gray-500">List your main services or products</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="sales@example.com"
                required
              />
            </div>
          </section>

          {/* Chatbot Personality */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Chatbot Personality</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tone
              </label>
              <div className="space-y-2">
                {TONES.map((tone) => (
                  <label key={tone.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="tone"
                      value={tone.value}
                      checked={form.tone === tone.value}
                      onChange={(e) => setForm({ ...form, tone: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{tone.label}</div>
                      <div className="text-sm text-gray-500">{tone.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Call-to-Action
              </label>
              <input
                type="text"
                value={form.cta}
                onChange={(e) => setForm({ ...form, cta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Free 15-minute consultation"
              />
              <p className="mt-1 text-xs text-gray-500">What should the bot offer when ready to close?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Restrictions (optional)
              </label>
              <textarea
                value={form.restrictions}
                onChange={(e) => setForm({ ...form, restrictions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={2}
                placeholder="Never mention competitor products, don't discuss pricing specifics..."
              />
              <p className="mt-1 text-xs text-gray-500">Topics the bot should avoid</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Context (optional)
              </label>
              <textarea
                value={form.extra_context}
                onChange={(e) => setForm({ ...form, extra_context: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={3}
                placeholder="Special instructions, company policies, FAQs..."
              />
            </div>
          </section>

          {/* Widget Appearance */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Widget Appearance</h2>

            <div className="flex gap-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position
                </label>
                <select
                  value={form.widget_position}
                  onChange={(e) => setForm({ ...form, widget_position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                Widget is active (visible on your website)
              </label>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setView("list")}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : isEditing ? "Update Widget" : "Create Widget"}
            </button>
          </div>
        </form>
      )}

      {/* Embed Code View */}
      {view === "embed" && selectedWidget && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: selectedWidget.primary_color }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
              </svg>
            </div>
            <h2 className="text-lg font-medium">{selectedWidget.business_name}</h2>
          </div>

          {embedCode ? (
            <>
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">HTML</span>
                  <button
                    onClick={() => copyToClipboard(embedCode.embed_code)}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                  <code>{embedCode.embed_code}</code>
                </pre>
              </section>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 px-4 py-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">How to use</h3>
                <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                  <li>Copy the code above</li>
                  <li>Paste it just before the closing <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">&lt;/body&gt;</code> tag on your website</li>
                  <li>The chat widget will appear in the {selectedWidget.widget_position === "bottom-right" ? "bottom right" : "bottom left"} corner</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">Loading embed code...</div>
          )}
        </div>
      )}

      {/* Conversations View */}
      {view === "conversations" && selectedWidget && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: selectedWidget.primary_color }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
              </svg>
            </div>
            <h2 className="text-lg font-medium">{selectedWidget.business_name} - Conversations</h2>
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Conversations will appear here when visitors use this chat widget</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {conv.lead_email ? (
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {conv.lead_email}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Anonymous visitor</span>
                        )}
                        {conv.lead_captured_at && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
                            Lead captured
                          </span>
                        )}
                      </div>
                      {conv.page_url && (
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                          {conv.page_url}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{conv.message_count} messages</div>
                      <div className="text-xs">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {conv.lead_phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Phone: {conv.lead_phone}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
