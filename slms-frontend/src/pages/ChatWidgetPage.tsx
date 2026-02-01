// src/pages/ChatWidgetPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import apiRequest from "@/utils/api";
import { FriendlyError } from "@/components/FriendlyError";

interface ChatWidgetConfig {
  id?: number;
  business_name: string;
  business_description: string;
  services: string;
  restrictions: string;
  cta: string;
  contact_email: string;
  tone: string;
  extra_context: string;
  primary_color: string;
  widget_position: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface EmbedCode {
  embed_code: string;
  org_key: string;
}

interface Conversation {
  id: number;
  session_id: string;
  page_url: string | null;
  lead_email: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  lead_captured_at: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

const TONES = [
  { value: "friendly", label: "Friendly", desc: "Warm and approachable, like a helpful colleague" },
  { value: "professional", label: "Professional", desc: "Polished and courteous, businesslike" },
  { value: "casual", label: "Casual", desc: "Relaxed and conversational" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
];

export default function ChatWidgetPage() {
  useDocumentTitle("AI Chat Widget");

  const [activeTab, setActiveTab] = useState<"setup" | "embed" | "conversations">("setup");
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null);
  const [embedCode, setEmbedCode] = useState<EmbedCode | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [form, setForm] = useState<ChatWidgetConfig>({
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
  });

  // Load existing config
  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<ChatWidgetConfig | null>("/api/chat-widget/config");
        if (data) {
          setConfig(data);
          setForm(data);
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load embed code when tab changes
  useEffect(() => {
    if (activeTab === "embed" && config) {
      loadEmbedCode();
    }
    if (activeTab === "conversations" && config) {
      loadConversations();
    }
  }, [activeTab, config]);

  async function loadEmbedCode() {
    try {
      const data = await apiRequest<EmbedCode>("/api/chat-widget/embed-code");
      setEmbedCode(data);
    } catch (err) {
      console.error("Failed to load embed code:", err);
    }
  }

  async function loadConversations() {
    try {
      const data = await apiRequest<Conversation[]>("/api/chat-widget/conversations?limit=50");
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data = await apiRequest<ChatWidgetConfig>("/api/chat-widget/config", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setConfig(data);
      setForm(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }, [form]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

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
      <header>
        <h1 className="text-2xl font-semibold">AI Chat Widget</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Add an AI-powered chat assistant to your website that captures leads automatically
        </p>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("setup")}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "setup"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Setup
          </button>
          <button
            onClick={() => setActiveTab("embed")}
            disabled={!config}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "embed"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            } ${!config ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Embed Code
          </button>
          <button
            onClick={() => setActiveTab("conversations")}
            disabled={!config}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "conversations"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            } ${!config ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Conversations
          </button>
        </nav>
      </div>

      {/* Setup Tab */}
      {activeTab === "setup" && (
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
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : config ? "Update Configuration" : "Save Configuration"}
            </button>
          </div>
        </form>
      )}

      {/* Embed Code Tab */}
      {activeTab === "embed" && (
        <div className="space-y-6">
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
                  <li>The chat widget will appear in the {form.widget_position === "bottom-right" ? "bottom right" : "bottom left"} corner</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">Loading embed code...</div>
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Conversations will appear here when visitors use your chat widget</p>
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
