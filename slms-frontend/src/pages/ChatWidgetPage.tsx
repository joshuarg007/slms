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
  getChatWidgetTemplates,
  getChatWidgetTemplate,
  type ChatWidgetConfig,
  type ChatWidgetEmbedCode,
  type ChatWidgetConversation,
  type ChatWidgetTemplate,
} from "@/utils/api";
import { FriendlyError } from "@/components/FriendlyError";

const TONES = [
  { value: "friendly", label: "Friendly", desc: "Warm and approachable, like a helpful colleague" },
  { value: "professional", label: "Professional", desc: "Polished and courteous, businesslike" },
  { value: "casual", label: "Casual", desc: "Relaxed and conversational" },
];

const PRIMARY_GOALS = [
  { value: "capture_email", label: "Capture Email", desc: "Get visitor's email for follow-up" },
  { value: "book_demo", label: "Book Demo", desc: "Drive visitors to schedule a demo/meeting" },
  { value: "start_trial", label: "Start Trial", desc: "Push visitors to sign up for free trial" },
  { value: "get_quote", label: "Get Quote", desc: "Collect requirements for a custom quote" },
  { value: "capture_phone", label: "Capture Phone", desc: "Get phone number as primary contact" },
  { value: "support_only", label: "Support Only", desc: "Answer questions, no sales push" },
];

const PERSISTENCE_LEVELS = [
  { value: "soft", label: "Soft", desc: "Gentle follow-ups, respect rejections quickly" },
  { value: "medium", label: "Medium", desc: "Balanced persistence with value-adds" },
  { value: "aggressive", label: "Aggressive", desc: "Full closer mode, maximum attempts" },
];

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
];

const BUBBLE_ICONS = [
  { value: "chat", label: "Chat Bubble", icon: "M12 2C6.48 2 2 6.48 2 12c0 1.85.53 3.57 1.42 5.04L2 22l4.96-1.42C8.43 21.47 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" },
  { value: "message", label: "Message", icon: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10z" },
  { value: "support", label: "Support", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" },
  { value: "robot", label: "Robot", icon: "M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z" },
  { value: "sparkle", label: "Sparkle", icon: "M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" },
  { value: "wave", label: "Lightning", icon: "M7 2v11h3v9l7-12h-4l3-8H7z" },
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
  // Goal and behavior
  primary_goal: "capture_email",
  goal_url: null,
  rebuttal_count: 5,
  persistence_level: "medium",
  welcome_message: null,
  success_message: null,
  collect_phone: false,
  collect_name: true,
  collect_company: false,
  quick_replies: null,
  // Appearance
  primary_color: "#4f46e5",
  widget_position: "bottom-right",
  bubble_icon: "chat",
  // Advanced appearance
  header_title: null,
  header_subtitle: null,
  chat_bg_color: null,
  user_bubble_color: null,
  bot_bubble_color: null,
  button_size: "medium",
  show_branding: true,
  is_active: true,
};

const BUTTON_SIZES = [
  { value: "small", label: "Small", size: "48px" },
  { value: "medium", label: "Medium", size: "56px" },
  { value: "large", label: "Large", size: "64px" },
];

export default function ChatWidgetPage() {
  useDocumentTitle("AI Chat Widgets");

  const [view, setView] = useState<"list" | "form" | "embed" | "conversations">("list");
  const [widgets, setWidgets] = useState<ChatWidgetConfig[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<ChatWidgetConfig | null>(null);
  const [embedCode, setEmbedCode] = useState<ChatWidgetEmbedCode | null>(null);
  const [conversations, setConversations] = useState<ChatWidgetConversation[]>([]);
  const [templates, setTemplates] = useState<ChatWidgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [quickReplyInput, setQuickReplyInput] = useState("");

  // Load widgets and templates
  const loadWidgets = useCallback(async () => {
    try {
      const [widgetsData, templatesData] = await Promise.all([
        getChatWidgetConfigs(),
        getChatWidgetTemplates(),
      ]);
      setWidgets(widgetsData);
      setTemplates(templatesData);
    } catch (err) {
      console.error("Failed to load widgets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  // Apply template to form
  const applyTemplate = async (templateId: string) => {
    try {
      const template = await getChatWidgetTemplate(templateId);
      setForm(prev => ({
        ...prev,
        business_description: template.business_description,
        services: template.services,
        cta: template.cta,
        tone: template.tone,
        primary_goal: template.primary_goal,
        rebuttal_count: template.rebuttal_count,
        persistence_level: template.persistence_level,
        collect_name: template.collect_name,
        collect_phone: template.collect_phone,
        collect_company: template.collect_company,
        quick_replies: template.quick_replies,
      }));
    } catch (err) {
      console.error("Failed to load template:", err);
    }
  };

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
      primary_goal: widget.primary_goal || "capture_email",
      goal_url: widget.goal_url,
      rebuttal_count: widget.rebuttal_count || 5,
      persistence_level: widget.persistence_level || "medium",
      welcome_message: widget.welcome_message,
      success_message: widget.success_message,
      collect_phone: widget.collect_phone ?? false,
      collect_name: widget.collect_name ?? true,
      collect_company: widget.collect_company ?? false,
      quick_replies: widget.quick_replies,
      primary_color: widget.primary_color,
      widget_position: widget.widget_position,
      bubble_icon: widget.bubble_icon || "chat",
      header_title: widget.header_title,
      header_subtitle: widget.header_subtitle,
      chat_bg_color: widget.chat_bg_color,
      user_bubble_color: widget.user_bubble_color,
      bot_bubble_color: widget.bot_bubble_color,
      button_size: widget.button_size || "medium",
      show_branding: widget.show_branding ?? true,
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

          {/* Quick Start Templates */}
          {!isEditing && templates.length > 0 && (
            <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
              <h2 className="text-lg font-medium">Quick Start Templates</h2>
              <p className="text-sm text-gray-500">Choose a template to pre-fill settings for your industry</p>
              <div className="grid grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-left"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Goal Configuration */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Goal Configuration</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Goal
              </label>
              <div className="space-y-2">
                {PRIMARY_GOALS.map((goal) => (
                  <label key={goal.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="primary_goal"
                      value={goal.value}
                      checked={form.primary_goal === goal.value}
                      onChange={(e) => setForm({ ...form, primary_goal: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{goal.label}</div>
                      <div className="text-sm text-gray-500">{goal.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {(form.primary_goal === "book_demo" || form.primary_goal === "start_trial") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {form.primary_goal === "book_demo" ? "Calendar URL (Calendly, Cal.com, etc.)" : "Signup URL"}
                </label>
                <input
                  type="url"
                  value={form.goal_url || ""}
                  onChange={(e) => setForm({ ...form, goal_url: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={form.primary_goal === "book_demo" ? "https://calendly.com/yourname" : "https://yoursite.com/signup"}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Information to Collect
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.collect_name}
                    onChange={(e) => setForm({ ...form, collect_name: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.collect_phone}
                    onChange={(e) => setForm({ ...form, collect_phone: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Phone</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.collect_company}
                    onChange={(e) => setForm({ ...form, collect_company: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Company</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">Email is always collected (except Support Only mode)</p>
            </div>
          </section>

          {/* Behavior Settings */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Behavior Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Persistence Level
              </label>
              <div className="space-y-2">
                {PERSISTENCE_LEVELS.map((level) => (
                  <label key={level.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="persistence_level"
                      value={level.value}
                      checked={form.persistence_level === level.value}
                      onChange={(e) => setForm({ ...form, persistence_level: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{level.label}</div>
                      <div className="text-sm text-gray-500">{level.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rebuttal Attempts: {form.rebuttal_count}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={form.rebuttal_count}
                onChange={(e) => setForm({ ...form, rebuttal_count: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 (give up quickly)</span>
                <span>10 (maximum persistence)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quick Replies (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickReplyInput}
                  onChange={(e) => setQuickReplyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quickReplyInput.trim()) {
                      e.preventDefault();
                      const current = form.quick_replies || [];
                      if (current.length < 5) {
                        setForm({ ...form, quick_replies: [...current, quickReplyInput.trim()] });
                        setQuickReplyInput("");
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Type a quick reply and press Enter"
                />
              </div>
              {form.quick_replies && form.quick_replies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.quick_replies.map((reply, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
                    >
                      {reply}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, quick_replies: form.quick_replies?.filter((_, i) => i !== idx) || null })}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">Suggested buttons for visitors to click (max 5)</p>
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

          {/* Custom Messages */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Custom Messages</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Welcome Message (optional)
              </label>
              <textarea
                value={form.welcome_message || ""}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={2}
                placeholder="Leave blank for auto-generated greeting based on tone"
              />
              <p className="mt-1 text-xs text-gray-500">Override the default first message</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Success Message (optional)
              </label>
              <textarea
                value={form.success_message || ""}
                onChange={(e) => setForm({ ...form, success_message: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={2}
                placeholder="Message after capturing contact info..."
              />
              <p className="mt-1 text-xs text-gray-500">What to say after getting their email/phone</p>
            </div>
          </section>

          {/* Widget Appearance */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Widget Appearance</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
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

              <div>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bubble Icon
              </label>
              <div className="grid grid-cols-6 gap-3">
                {BUBBLE_ICONS.map((icon) => (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => setForm({ ...form, bubble_icon: icon.value })}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      form.bubble_icon === icon.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    title={icon.label}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: form.primary_color }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d={icon.icon} />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Button Size
              </label>
              <div className="flex gap-4">
                {BUTTON_SIZES.map((size) => (
                  <label key={size.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="button_size"
                      value={size.value}
                      checked={form.button_size === size.value}
                      onChange={(e) => setForm({ ...form, button_size: e.target.value })}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{size.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Advanced Branding */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-4">
            <h2 className="text-lg font-medium">Advanced Branding</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Header Title (optional)
                </label>
                <input
                  type="text"
                  value={form.header_title || ""}
                  onChange={(e) => setForm({ ...form, header_title: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Override business name in header"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Header Subtitle (optional)
                </label>
                <input
                  type="text"
                  value={form.header_subtitle || ""}
                  onChange={(e) => setForm({ ...form, header_subtitle: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Online now, Here to help..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chat Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.chat_bg_color || "#1e1b4b"}
                    onChange={(e) => setForm({ ...form, chat_bg_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.chat_bg_color || ""}
                    onChange={(e) => setForm({ ...form, chat_bg_color: e.target.value || null })}
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    placeholder="#1e1b4b"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Bubble Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.user_bubble_color || form.primary_color}
                    onChange={(e) => setForm({ ...form, user_bubble_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.user_bubble_color || ""}
                    onChange={(e) => setForm({ ...form, user_bubble_color: e.target.value || null })}
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    placeholder="Uses primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bot Bubble Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.bot_bubble_color || "#2d2a5e"}
                    onChange={(e) => setForm({ ...form, bot_bubble_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.bot_bubble_color || ""}
                    onChange={(e) => setForm({ ...form, bot_bubble_color: e.target.value || null })}
                    className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                    placeholder="#2d2a5e"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="show_branding"
                  checked={form.show_branding}
                  onChange={(e) => setForm({ ...form, show_branding: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="show_branding" className="text-sm text-gray-700 dark:text-gray-300">
                  Show "Powered by Site2CRM" branding
                </label>
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
                  Widget is active
                </label>
              </div>
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
