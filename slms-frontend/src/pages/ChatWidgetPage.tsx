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

// Next-Gen Premium Icons - Detailed stroke-based SVGs
const BUBBLE_ICONS = [
  {
    value: "chat",
    label: "Chat",
    desc: "Classic chat bubble",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="8" cy="12" r="1" fill="currentColor" />
        <circle cx="16" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "message",
    label: "Message",
    desc: "Envelope style",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
        <line x1="2" y1="20" x2="8" y2="14" opacity="0.5" />
        <line x1="22" y1="20" x2="16" y2="14" opacity="0.5" />
      </svg>
    ),
  },
  {
    value: "support",
    label: "Support",
    desc: "Headset agent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        <circle cx="12" cy="12" r="2" opacity="0.4" />
        <path d="M12 14v3" opacity="0.4" />
      </svg>
    ),
  },
  {
    value: "robot",
    label: "Robot",
    desc: "AI assistant",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <circle cx="9" cy="14" r="1.5" fill="currentColor" />
        <circle cx="15" cy="14" r="1.5" fill="currentColor" />
        <path d="M12 2v4" />
        <circle cx="12" cy="2" r="1" fill="currentColor" />
        <path d="M8 17h8" strokeLinecap="round" />
        <path d="M1 12h2M21 12h2" opacity="0.5" />
      </svg>
    ),
  },
  {
    value: "sparkle",
    label: "Sparkle",
    desc: "Magic star",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5 5.8 21l2.4-7.3L2 9.2h7.6L12 2z" />
        <circle cx="19" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
        <circle cx="5" cy="19" r="1" fill="currentColor" opacity="0.4" />
        <path d="M19 2v2M18 3h2" opacity="0.5" />
      </svg>
    ),
  },
  {
    value: "wave",
    label: "Bolt",
    desc: "Lightning fast",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        <path d="M17 6l2-2M19 10h2M17 14l2 2" opacity="0.4" />
      </svg>
    ),
  },
  {
    value: "ai",
    label: "Neural",
    desc: "AI brain",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M16 10c2.2 0 4 1.8 4 4s-1.8 4-4 4" />
        <path d="M8 10c-2.2 0-4 1.8-4 4s1.8 4 4 4" />
        <path d="M9 18l3 4 3-4" />
        <circle cx="12" cy="6" r="1" fill="currentColor" />
        <path d="M12 9v4" opacity="0.5" />
        <circle cx="12" cy="14" r="1.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    value: "magic",
    label: "Magic",
    desc: "Wand sparkles",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 4l-1 1 5 5 1-1a2.83 2.83 0 0 0-5-5z" />
        <path d="M13 6L3 16l5 5 10-10" />
        <path d="M6 19l-2 2M19 5l1-2M21 8h2M17 2v2" opacity="0.5" />
        <circle cx="5" cy="5" r="1" fill="currentColor" opacity="0.6" />
        <circle cx="19" cy="19" r="0.5" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  {
    value: "heart",
    label: "Heart",
    desc: "Friendly love",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        <path d="M12 8v6M9 11h6" opacity="0.5" />
      </svg>
    ),
  },
  {
    value: "globe",
    label: "Globe",
    desc: "World connect",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <path d="M2 12h20" />
        <path d="M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10" opacity="0.5" />
        <path d="M12 2c-2.5 2.5-4 6-4 10s1.5 7.5 4 10" opacity="0.5" />
      </svg>
    ),
  },
  {
    value: "rocket",
    label: "Rocket",
    desc: "Launch ready",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        <circle cx="17" cy="7" r="1.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    value: "diamond",
    label: "Diamond",
    desc: "Premium quality",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 9l9.5 12.5L21.5 9" />
        <path d="M2.5 9L6 3h12l3.5 6" />
        <path d="M6 3l6 18M18 3l-6 18" opacity="0.4" />
        <path d="M2.5 9h19" />
        <path d="M12 3v6" opacity="0.3" />
      </svg>
    ),
  },
];

// Form tabs configuration
const FORM_TABS = [
  { id: "business", label: "Business", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { id: "goals", label: "Goals", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { id: "behavior", label: "Behavior", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { id: "personality", label: "Personality", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "messages", label: "Messages", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { id: "appearance", label: "Appearance", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
  { id: "branding", label: "Branding", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
];

// Extended form type to include new fields not yet in API
interface ExtendedFormState {
  business_name: string;
  business_description: string;
  services: string;
  restrictions: string;
  cta: string;
  contact_email: string;
  tone: string;
  extra_context: string;
  primary_goal: string;
  goal_url: string | null;
  rebuttal_count: number;
  persistence_level: string;
  welcome_message: string | null;
  success_message: string | null;
  collect_phone: boolean;
  collect_name: boolean;
  collect_company: boolean;
  quick_replies: string[] | null;
  primary_color: string;
  widget_position: string;
  bubble_icon: string;
  header_title: string | null;
  header_subtitle: string | null;
  chat_bg_color: string | null;
  user_bubble_color: string | null;
  bot_bubble_color: string | null;
  button_size: string;
  show_branding: boolean;
  is_active: boolean;
  // New appearance fields
  button_shape: string;
  gradient_type: string;
  gradient_color_1: string | null;
  gradient_color_2: string | null;
  gradient_color_3: string | null;
  gradient_angle: number;
  button_opacity: number;
  blur_background: boolean;
  // Effects
  attention_effect: string;
  shadow_style: string;
  entry_animation: string;
}

const EMPTY_FORM: ExtendedFormState = {
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
  // New appearance fields
  button_shape: "bubble",
  gradient_type: "none",
  gradient_color_1: null,
  gradient_color_2: null,
  gradient_color_3: null,
  gradient_angle: 135,
  button_opacity: 1,
  blur_background: false,
  // Effects
  attention_effect: "none",
  shadow_style: "elevated",
  entry_animation: "scale",
};

const BUTTON_SIZES = [
  { value: "small", label: "Small", size: "48px" },
  { value: "medium", label: "Medium", size: "56px" },
  { value: "large", label: "Large", size: "64px" },
];

// Button shape options
const BUTTON_SHAPES = [
  {
    value: "bubble",
    label: "Bubble",
    desc: "Classic circle",
    preview: (color: string) => (
      <div className="w-12 h-12 rounded-full" style={{ background: color }} />
    ),
  },
  {
    value: "pill",
    label: "Pill",
    desc: "Horizontal capsule",
    preview: (color: string) => (
      <div className="w-20 h-10 rounded-full flex items-center justify-center gap-2" style={{ background: color }}>
        <span className="text-white text-xs font-medium">Chat</span>
      </div>
    ),
  },
  {
    value: "square",
    label: "Square",
    desc: "Rounded corners",
    preview: (color: string) => (
      <div className="w-12 h-12 rounded-xl" style={{ background: color }} />
    ),
  },
  {
    value: "tab",
    label: "Tab",
    desc: "Side edge flag",
    preview: (color: string) => (
      <div className="w-8 h-20 rounded-l-lg flex items-center justify-center" style={{ background: color }}>
        <svg className="w-4 h-4 text-white -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
    ),
  },
  {
    value: "bar",
    label: "Bar",
    desc: "Full-width bottom",
    preview: (color: string) => (
      <div className="w-32 h-10 rounded-t-lg flex items-center justify-center gap-2" style={{ background: color }}>
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="text-white text-xs font-medium">Chat with us</span>
      </div>
    ),
  },
];

// Gradient presets
const GRADIENT_PRESETS = [
  { value: "none", label: "Solid", colors: null },
  { value: "sunset", label: "Sunset", colors: ["#f97316", "#ec4899"] },
  { value: "ocean", label: "Ocean", colors: ["#06b6d4", "#3b82f6"] },
  { value: "forest", label: "Forest", colors: ["#22c55e", "#14b8a6"] },
  { value: "purple", label: "Purple Haze", colors: ["#8b5cf6", "#ec4899"] },
  { value: "fire", label: "Fire", colors: ["#ef4444", "#f97316"] },
  { value: "midnight", label: "Midnight", colors: ["#1e3a8a", "#7c3aed"] },
  { value: "aurora", label: "Aurora", colors: ["#06b6d4", "#8b5cf6", "#ec4899"] },
  { value: "custom", label: "Custom", colors: null },
];

// Transparency levels
const TRANSPARENCY_LEVELS = [
  { value: "none", label: "Solid", opacity: 1 },
  { value: "subtle", label: "Subtle", opacity: 0.95 },
  { value: "light", label: "Light", opacity: 0.85 },
  { value: "medium", label: "Medium", opacity: 0.75 },
  { value: "glass", label: "Glass", opacity: 0.6 },
];

// Attention-grabbing effects
const ATTENTION_EFFECTS = [
  { value: "none", label: "None", desc: "Static button", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
  { value: "pulse", label: "Pulse", desc: "Gentle breathing", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { value: "bounce", label: "Bounce", desc: "Playful hop", icon: "M5 10l7-7m0 0l7 7m-7-7v18" },
  { value: "glow", label: "Glow", desc: "Radiant aura", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { value: "shake", label: "Shake", desc: "Attention wiggle", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { value: "ring", label: "Ring", desc: "Ripple wave", icon: "M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" },
];

// Shadow styles
const SHADOW_STYLES = [
  { value: "none", label: "None", class: "shadow-none" },
  { value: "subtle", label: "Subtle", class: "shadow-md" },
  { value: "elevated", label: "Elevated", class: "shadow-xl" },
  { value: "dramatic", label: "Dramatic", class: "shadow-2xl" },
  { value: "glow", label: "Color Glow", class: "shadow-lg" },
];

// Entry animations
const ENTRY_ANIMATIONS = [
  { value: "none", label: "None", desc: "Instant appear" },
  { value: "fade", label: "Fade In", desc: "Smooth opacity" },
  { value: "slide", label: "Slide Up", desc: "Rise from bottom" },
  { value: "scale", label: "Scale", desc: "Grow from small" },
  { value: "bounce", label: "Bounce In", desc: "Playful entrance" },
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
  const [form, setForm] = useState<ExtendedFormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [quickReplyInput, setQuickReplyInput] = useState("");
  const [activeTab, setActiveTab] = useState("business");

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
    setActiveTab("business");
    setView("form");
  };

  const handleEditWidget = (widget: ChatWidgetConfig) => {
    // Cast to any to access potential new fields
    const w = widget as ChatWidgetConfig & Partial<ExtendedFormState>;
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
      // New appearance fields (with defaults for existing widgets)
      button_shape: w.button_shape || "bubble",
      gradient_type: w.gradient_type || "none",
      gradient_color_1: w.gradient_color_1 || null,
      gradient_color_2: w.gradient_color_2 || null,
      gradient_color_3: w.gradient_color_3 || null,
      gradient_angle: w.gradient_angle || 135,
      button_opacity: w.button_opacity ?? 1,
      blur_background: w.blur_background ?? false,
      // Effects
      attention_effect: w.attention_effect || "none",
      shadow_style: w.shadow_style || "elevated",
      entry_animation: w.entry_animation || "scale",
    });
    setSelectedWidget(widget);
    setIsEditing(true);
    setError(null);
    setActiveTab("business");
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
      <div className="mx-auto max-w-5xl p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  // Tab content renderer
  const renderTabContent = () => {
    // Helper to generate button background style (used by appearance and branding tabs)
    const getButtonBackground = () => {
      if (form.gradient_type === "none" || (form.gradient_type === "custom" && !form.gradient_color_1)) {
        return form.primary_color;
      }
      if (form.gradient_type === "custom") {
        const colors = [form.gradient_color_1, form.gradient_color_2, form.gradient_color_3].filter(Boolean);
        return `linear-gradient(${form.gradient_angle}deg, ${colors.join(", ")})`;
      }
      const preset = GRADIENT_PRESETS.find(p => p.value === form.gradient_type);
      if (preset?.colors) {
        return `linear-gradient(${form.gradient_angle}deg, ${preset.colors.join(", ")})`;
      }
      return form.primary_color;
    };

    switch (activeTab) {
      case "business":
        return (
          <div className="space-y-5">
            {/* Quick Start Templates (only for new widgets) */}
            {!isEditing && templates.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Quick Start Template
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-left group"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="We help businesses grow through innovative digital marketing solutions..."
                required
              />
              <p className="mt-1.5 text-xs text-gray-500">Describe what your business does</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Services/Products *
              </label>
              <textarea
                value={form.services}
                onChange={(e) => setForm({ ...form, services: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="- Website design&#10;- SEO optimization&#10;- Social media management"
                required
              />
              <p className="mt-1.5 text-xs text-gray-500">List your main services or products</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="sales@example.com"
                required
              />
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Primary Goal
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PRIMARY_GOALS.map((goal) => (
                  <label
                    key={goal.value}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.primary_goal === goal.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="primary_goal"
                      value={goal.value}
                      checked={form.primary_goal === goal.value}
                      onChange={(e) => setForm({ ...form, primary_goal: e.target.value })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      form.primary_goal === goal.value
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}>
                      {form.primary_goal === goal.value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
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
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder={form.primary_goal === "book_demo" ? "https://calendly.com/yourname" : "https://yoursite.com/signup"}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Information to Collect
              </label>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "collect_name", label: "Name", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                  { key: "collect_phone", label: "Phone", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
                  { key: "collect_company", label: "Company", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      form[item.key as keyof typeof form]
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form[item.key as keyof typeof form] as boolean}
                      onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                      className="sr-only"
                    />
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                    {form[item.key as keyof typeof form] && (
                      <svg className="w-5 h-5 text-indigo-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">Email is always collected (except Support Only mode)</p>
            </div>
          </div>
        );

      case "behavior":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Persistence Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PERSISTENCE_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      form.persistence_level === level.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="persistence_level"
                      value={level.value}
                      checked={form.persistence_level === level.value}
                      onChange={(e) => setForm({ ...form, persistence_level: e.target.value })}
                      className="sr-only"
                    />
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      form.persistence_level === level.value
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}>
                      {level.value === "soft" && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {level.value === "medium" && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      {level.value === "aggressive" && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                      )}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{level.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{level.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rebuttal Attempts: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{form.rebuttal_count}</span>
              </label>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.rebuttal_count}
                  onChange={(e) => setForm({ ...form, rebuttal_count: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1 (give up quickly)</span>
                  <span>10 (maximum persistence)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Replies
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
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Type a quick reply and press Enter"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (quickReplyInput.trim()) {
                      const current = form.quick_replies || [];
                      if (current.length < 5) {
                        setForm({ ...form, quick_replies: [...current, quickReplyInput.trim()] });
                        setQuickReplyInput("");
                      }
                    }
                  }}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
                >
                  Add
                </button>
              </div>
              {form.quick_replies && form.quick_replies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.quick_replies.map((reply, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm group"
                    >
                      {reply}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, quick_replies: form.quick_replies?.filter((_, i) => i !== idx) || null })}
                        className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 flex items-center justify-center transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">Suggested buttons for visitors to click (max 5)</p>
            </div>
          </div>
        );

      case "personality":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Conversation Tone
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TONES.map((tone) => (
                  <label
                    key={tone.value}
                    className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      form.tone === tone.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={tone.value}
                      checked={form.tone === tone.value}
                      onChange={(e) => setForm({ ...form, tone: e.target.value })}
                      className="sr-only"
                    />
                    <div className={`text-3xl mb-2`}>
                      {tone.value === "friendly" && "😊"}
                      {tone.value === "professional" && "👔"}
                      {tone.value === "casual" && "😎"}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{tone.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{tone.desc}</div>
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Free 15-minute consultation"
              />
              <p className="mt-1.5 text-xs text-gray-500">What should the bot offer when ready to close?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Restrictions
              </label>
              <textarea
                value={form.restrictions}
                onChange={(e) => setForm({ ...form, restrictions: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                rows={2}
                placeholder="Never mention competitor products, don't discuss pricing specifics..."
              />
              <p className="mt-1.5 text-xs text-gray-500">Topics the bot should avoid</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Context
              </label>
              <textarea
                value={form.extra_context}
                onChange={(e) => setForm({ ...form, extra_context: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="Special instructions, company policies, FAQs..."
              />
            </div>
          </div>
        );

      case "messages":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Welcome Message
              </label>
              <textarea
                value={form.welcome_message || ""}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value || null })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="Leave blank for auto-generated greeting based on tone"
              />
              <p className="mt-1.5 text-xs text-gray-500">Override the default first message</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Success Message
              </label>
              <textarea
                value={form.success_message || ""}
                onChange={(e) => setForm({ ...form, success_message: e.target.value || null })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                rows={3}
                placeholder="Message after capturing contact info..."
              />
              <p className="mt-1.5 text-xs text-gray-500">What to say after getting their email/phone</p>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Message Preview</div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: form.primary_color }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-2 max-w-xs">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {form.welcome_message || (form.tone === "friendly" ? `Hi there! 👋 I'm the AI assistant for ${form.business_name || "your business"}. How can I help you today?` : form.tone === "professional" ? `Welcome to ${form.business_name || "our company"}. How may I assist you?` : "Hey! What can I help you with today?")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="w-14 h-14 rounded-xl cursor-pointer border-2 border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  <input
                    type="text"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Position
                </label>
                <div className="flex gap-3">
                  {POSITIONS.map((pos) => (
                    <label
                      key={pos.value}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                        form.widget_position === pos.value
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="widget_position"
                        value={pos.value}
                        checked={form.widget_position === pos.value}
                        onChange={(e) => setForm({ ...form, widget_position: e.target.value })}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{pos.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Button Shape */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Button Shape
              </label>
              <div className="grid grid-cols-5 gap-3">
                {BUTTON_SHAPES.map((shape) => (
                  <button
                    key={shape.value}
                    type="button"
                    onClick={() => setForm({ ...form, button_shape: shape.value })}
                    className={`group relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                      form.button_shape === shape.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
                    }`}
                  >
                    <div className="h-20 flex items-center justify-center mb-2 transition-transform group-hover:scale-105">
                      {shape.preview(getButtonBackground())}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{shape.label}</span>
                    <span className="text-[10px] text-gray-500">{shape.desc}</span>
                    {form.button_shape === shape.value && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bubble Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Button Icon
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {BUBBLE_ICONS.map((icon) => (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => setForm({ ...form, bubble_icon: icon.value })}
                    className={`group relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                      form.bubble_icon === icon.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
                    }`}
                  >
                    {/* Icon preview bubble */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white mb-2 transition-transform group-hover:scale-110 ${
                        form.bubble_icon === icon.value ? "ring-4 ring-indigo-500/30" : ""
                      }`}
                      style={{ background: getButtonBackground() }}
                    >
                      <div className="w-7 h-7">
                        {icon.icon}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{icon.label}</span>
                    <span className="text-[10px] text-gray-500">{icon.desc}</span>
                    {form.bubble_icon === icon.value && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Button Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Button Size
              </label>
              <div className="flex gap-4">
                {BUTTON_SIZES.map((size) => (
                  <label
                    key={size.value}
                    className={`flex-1 flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.button_size === size.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="button_size"
                      value={size.value}
                      checked={form.button_size === size.value}
                      onChange={(e) => setForm({ ...form, button_size: e.target.value })}
                      className="sr-only"
                    />
                    <div
                      className="rounded-full flex items-center justify-center text-white mb-2"
                      style={{
                        background: getButtonBackground(),
                        width: size.size,
                        height: size.size,
                      }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{size.label}</span>
                    <span className="text-xs text-gray-500">{size.size}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-6">
            {/* Live Button Preview */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Preview</span>
                <span className="text-xs text-gray-500">Your button as visitors see it</span>
              </div>
              <div className="relative h-24 flex items-center justify-center">
                {/* Checkerboard background to show transparency */}
                <div
                  className="absolute inset-0 rounded-xl opacity-30"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #ccc 25%, transparent 25%),
                      linear-gradient(-45deg, #ccc 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #ccc 75%),
                      linear-gradient(-45deg, transparent 75%, #ccc 75%)
                    `,
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                />
                {/* Preview button */}
                <div
                  className={`relative flex items-center justify-center text-white transition-all ${
                    form.button_shape === "bubble" ? "w-14 h-14 rounded-full" :
                    form.button_shape === "pill" ? "w-24 h-12 rounded-full gap-2" :
                    form.button_shape === "square" ? "w-14 h-14 rounded-xl" :
                    form.button_shape === "tab" ? "w-10 h-24 rounded-l-lg" :
                    "w-40 h-12 rounded-t-lg gap-2"
                  } ${
                    form.shadow_style === "none" ? "" :
                    form.shadow_style === "subtle" ? "shadow-md" :
                    form.shadow_style === "elevated" ? "shadow-xl" :
                    form.shadow_style === "dramatic" ? "shadow-2xl" :
                    "shadow-lg"
                  } ${
                    form.attention_effect === "pulse" ? "animate-pulse" :
                    form.attention_effect === "bounce" ? "animate-bounce" :
                    ""
                  }`}
                  style={{
                    background: getButtonBackground(),
                    opacity: form.button_opacity,
                    backdropFilter: form.blur_background ? "blur(8px)" : "none",
                    WebkitBackdropFilter: form.blur_background ? "blur(8px)" : "none",
                    boxShadow: form.shadow_style === "glow"
                      ? `0 0 30px ${form.primary_color}60, 0 0 60px ${form.primary_color}30`
                      : undefined,
                    animation: form.attention_effect === "glow"
                      ? "glow-pulse 2s ease-in-out infinite"
                      : form.attention_effect === "shake"
                      ? "shake 0.5s ease-in-out infinite"
                      : form.attention_effect === "ring"
                      ? undefined
                      : undefined,
                  }}
                >
                  {form.button_shape === "tab" ? (
                    <svg className="w-5 h-5 -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {(form.button_shape === "pill" || form.button_shape === "bar") && (
                        <span className="text-sm font-medium">{form.button_shape === "bar" ? "Chat with us" : "Chat"}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {/* Preview info badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {form.gradient_type !== "none" && (
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    {GRADIENT_PRESETS.find(p => p.value === form.gradient_type)?.label || "Gradient"}
                  </span>
                )}
                {form.button_opacity < 1 && (
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {Math.round(form.button_opacity * 100)}% opacity
                  </span>
                )}
                {form.blur_background && (
                  <span className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                    Glassmorphism
                  </span>
                )}
                {form.attention_effect !== "none" && (
                  <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {ATTENTION_EFFECTS.find(e => e.value === form.attention_effect)?.label}
                  </span>
                )}
                {form.shadow_style !== "none" && (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {SHADOW_STYLES.find(s => s.value === form.shadow_style)?.label} shadow
                  </span>
                )}
                {form.entry_animation !== "none" && (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    {ENTRY_ANIMATIONS.find(a => a.value === form.entry_animation)?.label}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Header Title
                </label>
                <input
                  type="text"
                  value={form.header_title || ""}
                  onChange={(e) => setForm({ ...form, header_title: e.target.value || null })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Override business name in header"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Header Subtitle
                </label>
                <input
                  type="text"
                  value={form.header_subtitle || ""}
                  onChange={(e) => setForm({ ...form, header_subtitle: e.target.value || null })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Online now, Here to help..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Color Scheme
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Chat Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.chat_bg_color || "#1e1b4b"}
                      onChange={(e) => setForm({ ...form, chat_bg_color: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-700"
                    />
                    <input
                      type="text"
                      value={form.chat_bg_color || ""}
                      onChange={(e) => setForm({ ...form, chat_bg_color: e.target.value || null })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="#1e1b4b"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">User Bubble</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.user_bubble_color || form.primary_color}
                      onChange={(e) => setForm({ ...form, user_bubble_color: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-700"
                    />
                    <input
                      type="text"
                      value={form.user_bubble_color || ""}
                      onChange={(e) => setForm({ ...form, user_bubble_color: e.target.value || null })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Bot Bubble</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.bot_bubble_color || "#2d2a5e"}
                      onChange={(e) => setForm({ ...form, bot_bubble_color: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-700"
                    />
                    <input
                      type="text"
                      value={form.bot_bubble_color || ""}
                      onChange={(e) => setForm({ ...form, bot_bubble_color: e.target.value || null })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="#2d2a5e"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gradient Presets */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Button Gradient
              </label>
              <div className="grid grid-cols-3 gap-3">
                {GRADIENT_PRESETS.map((preset) => {
                  const previewBg = preset.colors
                    ? `linear-gradient(135deg, ${preset.colors.join(", ")})`
                    : form.primary_color;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        if (preset.value === "custom") {
                          setForm({
                            ...form,
                            gradient_type: "custom",
                            gradient_color_1: form.gradient_color_1 || form.primary_color,
                            gradient_color_2: form.gradient_color_2 || "#ec4899",
                          });
                        } else {
                          setForm({ ...form, gradient_type: preset.value });
                        }
                      }}
                      className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        form.gradient_type === preset.value
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div
                        className="w-full h-8 rounded-lg mb-2"
                        style={{
                          background: preset.value === "none" ? form.primary_color : previewBg,
                        }}
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{preset.label}</span>
                      {form.gradient_type === preset.value && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Gradient Colors */}
              {form.gradient_type === "custom" && (
                <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Colors</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (form.gradient_color_3) {
                          setForm({ ...form, gradient_color_3: null });
                        } else {
                          setForm({ ...form, gradient_color_3: "#8b5cf6" });
                        }
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {form.gradient_color_3 ? "Remove 3rd color" : "+ Add 3rd color"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.gradient_color_1 || form.primary_color}
                          onChange={(e) => setForm({ ...form, gradient_color_1: e.target.value })}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700"
                        />
                        <input
                          type="text"
                          value={form.gradient_color_1 || ""}
                          onChange={(e) => setForm({ ...form, gradient_color_1: e.target.value || null })}
                          className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                          placeholder={form.primary_color}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.gradient_color_2 || "#ec4899"}
                          onChange={(e) => setForm({ ...form, gradient_color_2: e.target.value })}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700"
                        />
                        <input
                          type="text"
                          value={form.gradient_color_2 || ""}
                          onChange={(e) => setForm({ ...form, gradient_color_2: e.target.value || null })}
                          className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                          placeholder="#ec4899"
                        />
                      </div>
                    </div>
                    {form.gradient_color_3 && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Middle</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.gradient_color_3}
                            onChange={(e) => setForm({ ...form, gradient_color_3: e.target.value })}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700"
                          />
                          <input
                            type="text"
                            value={form.gradient_color_3}
                            onChange={(e) => setForm({ ...form, gradient_color_3: e.target.value || null })}
                            className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gradient Angle */}
              {form.gradient_type !== "none" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gradient Angle</label>
                    <span className="text-sm text-gray-500">{form.gradient_angle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={form.gradient_angle}
                    onChange={(e) => setForm({ ...form, gradient_angle: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0°</span>
                    <span>90°</span>
                    <span>180°</span>
                    <span>270°</span>
                    <span>360°</span>
                  </div>
                </div>
              )}
            </div>

            {/* Transparency / Glassmorphism */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Transparency
              </label>
              <div className="flex gap-2">
                {TRANSPARENCY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setForm({ ...form, button_opacity: level.opacity })}
                    className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                      form.button_opacity === level.opacity
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full mb-1.5"
                      style={{
                        background: form.primary_color,
                        opacity: level.opacity,
                      }}
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{level.label}</span>
                    <span className="text-[10px] text-gray-500">{Math.round(level.opacity * 100)}%</span>
                  </button>
                ))}
              </div>

              {/* Blur Background Toggle */}
              <label className="flex items-center justify-between mt-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 flex items-center justify-center backdrop-blur">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Glassmorphism Effect</div>
                    <div className="text-sm text-gray-500">Add blur to button background</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.blur_background}
                    onChange={(e) => setForm({ ...form, blur_background: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </div>
              </label>
            </div>

            {/* Effects Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Effects</h3>
                  <p className="text-xs text-gray-500">Animations and visual flair</p>
                </div>
              </div>

              {/* Attention Effect */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attention Effect
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ATTENTION_EFFECTS.map((effect) => (
                    <button
                      key={effect.value}
                      type="button"
                      onClick={() => setForm({ ...form, attention_effect: effect.value })}
                      className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        form.attention_effect === effect.value
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                        form.attention_effect === effect.value
                          ? "bg-amber-100 dark:bg-amber-900/50"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        <svg className={`w-4 h-4 ${form.attention_effect === effect.value ? "text-amber-600" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={effect.icon} />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{effect.label}</span>
                      <span className="text-[10px] text-gray-500">{effect.desc}</span>
                      {form.attention_effect === effect.value && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shadow Style */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shadow Style
                </label>
                <div className="flex gap-2">
                  {SHADOW_STYLES.map((shadow) => (
                    <button
                      key={shadow.value}
                      type="button"
                      onClick={() => setForm({ ...form, shadow_style: shadow.value })}
                      className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        form.shadow_style === shadow.value
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full mb-1.5 ${
                          shadow.value === "glow"
                            ? "shadow-lg"
                            : shadow.class
                        }`}
                        style={{
                          background: form.primary_color,
                          boxShadow: shadow.value === "glow"
                            ? `0 0 20px ${form.primary_color}80`
                            : undefined,
                        }}
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{shadow.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry Animation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entry Animation
                </label>
                <div className="flex gap-2">
                  {ENTRY_ANIMATIONS.map((anim) => (
                    <button
                      key={anim.value}
                      type="button"
                      onClick={() => setForm({ ...form, entry_animation: anim.value })}
                      className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        form.entry_animation === anim.value
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{anim.label}</span>
                      <span className="text-[10px] text-gray-500">{anim.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Show Site2CRM Branding</div>
                    <div className="text-sm text-gray-500">Display "Powered by Site2CRM" link</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    id="show_branding"
                    checked={form.show_branding}
                    onChange={(e) => setForm({ ...form, show_branding: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.is_active ? "bg-green-100 dark:bg-green-900/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <svg className={`w-5 h-5 ${form.is_active ? "text-green-600 dark:text-green-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Widget Active</div>
                    <div className="text-sm text-gray-500">Enable or disable this chat widget</div>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </div>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
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
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/25"
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
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
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
            <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">No chat widgets yet</p>
              <p className="text-sm mt-2 text-gray-500 max-w-sm mx-auto">Create your first AI chat widget to start capturing leads from your website visitors</p>
              <button
                onClick={handleNewWidget}
                className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/25"
              >
                Create Your First Widget
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg"
                        style={{ backgroundColor: widget.primary_color }}
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {widget.business_name}
                          </h3>
                          {widget.is_active ? (
                            <span className="px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {widget.business_description}
                        </p>
                        {widget.widget_key && (
                          <p className="text-xs text-gray-400 mt-2 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                            {widget.widget_key}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewConversations(widget)}
                        className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                        title="View conversations"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleViewEmbed(widget)}
                        className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                        title="Get embed code"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEditWidget(widget)}
                        className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                        title="Edit widget"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(widget)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
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

      {/* Form View with Tabs */}
      {view === "form" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <FriendlyError
              error={error}
              message="There was a problem saving your configuration."
              onRetry={() => setError(null)}
            />
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-1 overflow-x-auto pb-px">
              {FORM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
            {renderTabContent()}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-2">
              {FORM_TABS.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    activeTab === tab.id ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"
                  }`}
                  title={tab.label}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setView("list")}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/25"
              >
                {saving ? "Saving..." : isEditing ? "Update Widget" : "Create Widget"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Embed Code View */}
      {view === "embed" && selectedWidget && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg"
              style={{ backgroundColor: selectedWidget.primary_color }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold">{selectedWidget.business_name}</h2>
          </div>

          {embedCode ? (
            <>
              <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Embed Code</span>
                  <button
                    onClick={() => copyToClipboard(embedCode.embed_code)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
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
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-sm text-gray-800 dark:text-gray-200 overflow-x-auto bg-gray-900 dark:bg-gray-950">
                  <code className="text-green-400">{embedCode.embed_code}</code>
                </pre>
              </section>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 px-5 py-4">
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Installation Instructions
                </h3>
                <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-2">
                  <li>Copy the embed code above</li>
                  <li>Paste it just before the closing <code className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded font-mono text-xs">&lt;/body&gt;</code> tag on your website</li>
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
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg"
              style={{ backgroundColor: selectedWidget.primary_color }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{selectedWidget.business_name}</h2>
              <p className="text-sm text-gray-500">Conversations</p>
            </div>
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">No conversations yet</p>
              <p className="text-sm mt-2 text-gray-500">Conversations will appear here when visitors use this chat widget</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {conv.lead_email ? (
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {conv.lead_email}
                          </span>
                        ) : (
                          <span className="text-gray-500">Anonymous visitor</span>
                        )}
                        {conv.lead_captured_at && (
                          <span className="px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
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
                      <div className="font-medium">{conv.message_count} messages</div>
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
