// src/pages/OnboardingWizard.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthProvider";
import { getApiBase } from "@/utils/api";

// Step definitions
const STEPS = [
  { id: "welcome", title: "Welcome", icon: "wave" },
  { id: "company", title: "Company", icon: "building" },
  { id: "crm", title: "Connect CRM", icon: "link" },
  { id: "fields", title: "Form Fields", icon: "form" },
  { id: "style", title: "Style", icon: "palette" },
  { id: "embed", title: "Get Code", icon: "code" },
  { id: "complete", title: "Done", icon: "check" },
];

const CRM_OPTIONS = [
  { value: "hubspot", label: "HubSpot", color: "#FF7A59", tooltip: "Most popular choice — used by 200K+ companies. Your leads sync in under 3 seconds." },
  { value: "salesforce", label: "Salesforce", color: "#00A1E0", tooltip: "Enterprise-grade sync. Perfect for complex sales workflows and large teams." },
  { value: "pipedrive", label: "Pipedrive", color: "#017737", tooltip: "Built for closers. Visual pipeline + instant lead capture = more deals won." },
  { value: "zoho", label: "Zoho CRM", color: "#E42527", tooltip: "Full-suite power at a fraction of the cost. Smart choice for growing teams." },
  { value: "nutshell", label: "Nutshell", color: "#FDB913", tooltip: "Simple, powerful, loved by small teams. Setup takes just 2 minutes." },
];

const TEAM_SIZE_OPTIONS = [
  { value: "just_me", label: "Just me", description: "Solo", tooltip: "Perfect for solopreneurs! You'll save 3+ hours/week on manual data entry. More time to close deals." },
  { value: "2-5", label: "2-5", description: "Small team", tooltip: "Teams your size see 40% faster lead response times. Every minute counts when leads are hot!" },
  { value: "6-20", label: "6-20", description: "Growing", tooltip: "Growing fast? We'll help you scale without chaos. Zero leads slip through the cracks." },
  { value: "20+", label: "20+", description: "Enterprise", tooltip: "Enterprise features included: SSO, audit logs, dedicated support. You're in good hands." },
];

const DEFAULT_FIELDS = [
  { id: "name", label: "Full Name", type: "text", enabled: true, required: true, icon: "👤", tooltip: "Personal touch matters — leads contacted by name convert 2x better." },
  { id: "email", label: "Email", type: "email", enabled: true, required: true, icon: "📧", tooltip: "Essential for follow-up. This is how you'll close the deal." },
  { id: "phone", label: "Phone", type: "tel", enabled: true, required: false, icon: "📱", tooltip: "Hot tip: Phone leads close 3x faster. Enable for high-intent prospects." },
  { id: "company", label: "Company", type: "text", enabled: true, required: false, icon: "🏢", tooltip: "Know who you're talking to. Company info helps prioritize enterprise deals." },
  { id: "job_title", label: "Job Title", type: "text", enabled: false, required: false, icon: "💼", tooltip: "Decision maker or influencer? Job title reveals buying power instantly." },
  { id: "message", label: "Message", type: "textarea", enabled: false, required: false, icon: "💬", tooltip: "Let leads tell you what they need. Pre-qualified = faster close." },
];

const STYLE_THEMES = [
  { id: "modern", name: "Modern", primary: "#4F46E5", bg: "#F9FAFB", radius: "12px", border: "none", tooltip: "Our most popular theme • Clean rounded corners with soft shadows • Converts 23% better than generic forms" },
  { id: "minimal", name: "Minimal", primary: "#18181B", bg: "#FFFFFF", radius: "4px", border: "1px solid #E5E7EB", tooltip: "Less is more • Sharp edges, subtle borders • Perfect for luxury brands and premium services" },
  { id: "bold", name: "Bold", primary: "#DC2626", bg: "#FEF2F2", radius: "16px", border: "none", tooltip: "Red creates urgency • Eye-catching and energetic • Great for limited-time offers and sales pages" },
  { id: "ocean", name: "Ocean", primary: "#0891B2", bg: "#ECFEFF", radius: "8px", border: "none", tooltip: "Blue builds trust • Calm and professional • Ideal for B2B, finance, and healthcare" },
  { id: "forest", name: "Forest", primary: "#059669", bg: "#ECFDF5", radius: "8px", border: "none", tooltip: "Green signals 'go' • Growth and success vibes • Perfect for eco, health, and wellness brands" },
  { id: "purple", name: "Purple", primary: "#7C3AED", bg: "#F5F3FF", radius: "12px", border: "none", tooltip: "Creative and premium • Attracts innovators • Popular with tech startups and creative agencies" },
  { id: "bordered", name: "Bordered", primary: "#3B82F6", bg: "#FFFFFF", radius: "8px", border: "2px solid #3B82F6", tooltip: "Clear boundaries draw the eye • Stands out on busy pages • Great for content-heavy websites" },
  { id: "custom", name: "Custom", primary: "#000000", bg: "#FFFFFF", radius: "8px", border: "none", tooltip: "" },
];

// Tooltip component with psychology-driven copy - uses fixed positioning to avoid parent constraints
function Tooltip({ text, children, wide = false, position = "above" }: { text: string | React.ReactNode; children: React.ReactNode; wide?: boolean; position?: "above" | "below" }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  if (!text) return <>{children}</>;

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (position === "below") {
        setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
      } else {
        setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
      }
    }
    setShow(true);
  };

  const getTransform = () => {
    if (position === "below") return "translateX(-50%)";
    return "translate(-50%, -100%)";
  };

  const getArrow = () => {
    if (position === "below") {
      return <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />;
    }
    return <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />;
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`fixed z-[9999] px-4 py-2.5 bg-gray-900 text-white text-sm rounded-xl shadow-2xl ${wide ? "w-80 text-left" : "w-64 text-left"}`}
          style={{
            top: pos.top,
            left: pos.left,
            transform: getTransform(),
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {getArrow()}
          {typeof text === "string" ? <span className="font-medium leading-relaxed">{text}</span> : text}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [companyName, setCompanyName] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [selectedCrm, setSelectedCrm] = useState("");
  const [crmConnected, setCrmConnected] = useState(false);
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [selectedTheme, setSelectedTheme] = useState("modern");
  const [embedCode, setEmbedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [customColor, setCustomColor] = useState("#4F46E5");
  const [customBorder, setCustomBorder] = useState(false);

  // Check if CRM is already connected (with valid token)
  useEffect(() => {
    async function checkCrm() {
      try {
        const res = await authFetch(`${getApiBase()}/integrations/crm/active`);
        if (res.ok) {
          const data = await res.json();
          // Only show connected if there's a provider AND it has a valid token
          if (data.provider && data.has_token) {
            setCrmConnected(true);
            setSelectedCrm(data.provider);
          }
        }
      } catch {
        // Ignore
      }
    }
    checkCrm();
  }, []);

  // Generate embed code when reaching that step
  useEffect(() => {
    if (STEPS[currentStep].id === "embed") {
      const theme = STYLE_THEMES.find(t => t.id === selectedTheme) || STYLE_THEMES[0];
      const primaryColor = selectedTheme === "custom" ? customColor : theme.primary;
      const border = selectedTheme === "custom" && customBorder ? `2px solid ${customColor}` : theme.border;
      const enabledFields = fields.filter(f => f.enabled);

      setEmbedCode(`<!-- Site2CRM Lead Capture Form -->
<div id="site2crm-form"></div>
<script src="https://api.site2crm.io/widget/form.js"></script>
<script>
  Site2CRM.init({
    container: '#site2crm-form',
    theme: '${selectedTheme}',
    primaryColor: '${primaryColor}',${border && border !== "none" ? `\n    border: '${border}',` : ""}
    fields: ${JSON.stringify(enabledFields.map(f => ({ name: f.id, required: f.required })), null, 2)}
  });
</script>`);
    }
  }, [currentStep, selectedTheme, fields, customColor, customBorder]);

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setError("");
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  }

  function toggleField(fieldId: string) {
    setFields(fields.map(f =>
      f.id === fieldId ? { ...f, enabled: !f.enabled } : f
    ));
  }

  function toggleRequired(fieldId: string) {
    setFields(fields.map(f =>
      f.id === fieldId ? { ...f, required: !f.required } : f
    ));
  }

  async function handleCrmConnect(crm: string) {
    setSelectedCrm(crm);
    // Redirect to CRM OAuth flow
    window.location.href = `${getApiBase()}/integrations/${crm}/auth`;
  }

  async function completeOnboarding() {
    setLoading(true);
    setError("");

    try {
      // Save company info
      const res = await authFetch(`${getApiBase()}/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim() || "My Company",
          crm: selectedCrm || "none",
          team_size: teamSize || "just_me",
          form_theme: selectedTheme === "custom" ? "custom" : selectedTheme,
          form_fields: fields.filter(f => f.enabled).map(f => f.id),
          custom_color: selectedTheme === "custom" ? customColor : undefined,
          custom_border: selectedTheme === "custom" ? customBorder : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update token with fresh one from server (security best practice)
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
        }
        await refreshUser();
        nextStep(); // Go to complete step
      } else {
        const data = await res.json();
        setError(data.detail || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function goToDashboard() {
    navigate("/app", { replace: true });
  }

  // Render current step content
  function renderStepContent() {
    const step = STEPS[currentStep];

    switch (step.id) {
      case "welcome":
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome to Site2CRM!
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Let's get you set up in just a few minutes. We'll help you connect your CRM and create your first lead capture form.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
              <Tooltip text="HubSpot, Salesforce, Pipedrive & more. One-click OAuth — no API keys needed.">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl cursor-help hover:scale-105 transition-transform">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">1</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Connect CRM</div>
                </div>
              </Tooltip>
              <Tooltip text="Drag & drop fields, pick colors, preview live. Takes 60 seconds.">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl cursor-help hover:scale-105 transition-transform">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">2</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Build Form</div>
                </div>
              </Tooltip>
              <Tooltip text="Copy one snippet. Works on any site — WordPress, Webflow, HTML, React.">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl cursor-help hover:scale-105 transition-transform">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">3</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Get Code</div>
                </div>
              </Tooltip>
            </div>
          </div>
        );

      case "company":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tell us about your company
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                This helps us personalize your experience
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Team Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TEAM_SIZE_OPTIONS.map((opt) => (
                  <Tooltip key={opt.value} text={opt.tooltip}>
                    <button
                      type="button"
                      onClick={() => setTeamSize(opt.value)}
                      className={`w-full p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] hover:shadow-md ${
                        teamSize === opt.value
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600"
                      }`}
                    >
                      <div className="font-bold text-lg text-gray-900 dark:text-white">{opt.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</div>
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        );

      case "crm":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Connect your CRM
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                We'll sync your leads automatically
              </p>
            </div>

            {crmConnected ? (
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 text-center">
                <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="font-medium text-green-800 dark:text-green-200">
                  {CRM_OPTIONS.find(c => c.value === selectedCrm)?.label || selectedCrm} Connected!
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Your leads will sync automatically
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CRM_OPTIONS.map((crm) => (
                  <Tooltip key={crm.value} text={crm.tooltip}>
                    <button
                      type="button"
                      onClick={() => handleCrmConnect(crm.value)}
                      className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 flex flex-col items-center gap-2 transition-all group hover:shadow-lg hover:scale-[1.02]"
                    >
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-lg transition-shadow"
                        style={{ backgroundColor: crm.color }}
                      >
                        {crm.label.charAt(0)}
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white">{crm.label}</div>
                    </button>
                  </Tooltip>
                ))}
              </div>
            )}

            <Tooltip
              wide
              text={
                <div>
                  <div className="font-semibold text-white mb-2">⏭️ No worries, connect anytime</div>
                  <ul className="space-y-1.5 text-gray-200 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><strong>Forms work standalone</strong> — leads saved in Site2CRM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><strong>Connect later</strong> — one click in Settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><strong>Backfill supported</strong> — existing leads sync when connected</span>
                    </li>
                  </ul>
                </div>
              }
            >
              <button
                type="button"
                onClick={nextStep}
                className="w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              >
                Skip for now - I'll connect later
              </button>
            </Tooltip>
          </div>
        );

      case "fields":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Configure your form fields
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Choose what information to collect from leads
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fields.map((field) => (
                <Tooltip key={field.id} text={field.tooltip}>
                  <div
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] ${
                      field.enabled
                        ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    onClick={() => toggleField(field.id)}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="text-2xl">{field.icon}</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{field.label}</div>
                      {field.enabled ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleRequired(field.id); }}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                            field.required
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {field.required ? "Required" : "Optional"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Click to add</span>
                      )}
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        );

      case "style":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Choose your form style
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Pick a theme that matches your brand
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STYLE_THEMES.filter(t => t.id !== "custom").map((theme) => (
                <Tooltip key={theme.id} text={theme.tooltip}>
                  <button
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`w-full p-3 rounded-xl border-2 transition-all hover:scale-[1.03] hover:shadow-md ${
                      selectedTheme === theme.id
                        ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-md"
                        : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                    }`}
                  >
                    <div
                      className="h-16 rounded-lg mb-2 flex items-center justify-center transition-transform"
                      style={{ backgroundColor: theme.bg, border: theme.border }}
                    >
                      <div
                        className="px-4 py-1.5 text-white text-xs font-medium"
                        style={{ backgroundColor: theme.primary, borderRadius: theme.radius }}
                      >
                        Submit
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{theme.name}</div>
                  </button>
                </Tooltip>
              ))}
            </div>

            {/* Custom Color Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Tooltip
                wide
                text={
                  <div>
                    <div className="font-semibold text-white mb-2">🎨 Brand Consistency = Trust</div>
                    <ul className="space-y-1.5 text-gray-200 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span><strong>Color picker</strong> — grab your exact hex code</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span><strong>Border toggle</strong> — stand out or blend in</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span>
                        <span><strong>Live preview</strong> — see changes instantly</span>
                      </li>
                    </ul>
                    <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                      Pro tip: Match your site's primary CTA color for 31% higher conversions
                    </div>
                  </div>
                }
              >
                <button
                  type="button"
                  onClick={() => setSelectedTheme("custom")}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    selectedTheme === "custom"
                      ? "border-indigo-600 ring-2 ring-indigo-600/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg"
                        style={{ backgroundColor: customColor, border: customBorder ? `2px solid ${customColor}` : "none" }}
                      />
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-white">Custom Colors</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Match your brand exactly</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </Tooltip>

              {selectedTheme === "custom" && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        placeholder="#4F46E5"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Add border to form</span>
                    <button
                      type="button"
                      onClick={() => setCustomBorder(!customBorder)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        customBorder ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          customBorder ? "translate-x-5" : ""
                        }`}
                      />
                    </button>
                  </div>
                  {/* Preview */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview</div>
                    <div
                      className="h-20 rounded-lg flex items-center justify-center bg-white dark:bg-gray-900"
                      style={{ border: customBorder ? `2px solid ${customColor}` : "1px solid #E5E7EB" }}
                    >
                      <div
                        className="px-6 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: customColor }}
                      >
                        Submit
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "embed":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Add to your website
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Copy this code and paste it into your website
              </p>
            </div>

            <Tooltip
              wide
              position="below"
              text={
                <div>
                  <div className="font-semibold text-white mb-2">📋 One Snippet, Infinite Leads</div>
                  <ul className="space-y-1.5 text-gray-200 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><strong>Copy & paste</strong> — works on any website</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><strong>Auto-updates</strong> — change settings here, updates everywhere</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><strong>Lightweight</strong> — loads in under 50ms</span>
                    </li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                    Works with WordPress, Webflow, Squarespace, Wix, HTML & React
                  </div>
                </div>
              }
            >
              <div className="relative cursor-help">
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-sm overflow-x-auto">
                  <code>{embedCode}</code>
                </pre>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(embedCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`absolute top-2 right-2 px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${
                    copied ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </Tooltip>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> Paste this code just before the closing <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">&lt;/body&gt;</code> tag on any page where you want the form to appear.
                </div>
              </div>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                You're all set!
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Your lead capture form is ready. Start collecting leads and watch them sync to your CRM automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-4">
              <button
                type="button"
                onClick={() => navigate("/app/forms/embed")}
                className="p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <div className="text-sm font-medium text-gray-900 dark:text-white">View Embed</div>
              </button>
              <button
                type="button"
                onClick={() => navigate("/app/integrations")}
                className="p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Integrations</div>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  const isLastContentStep = STEPS[currentStep].id === "embed";
  const isComplete = STEPS[currentStep].id === "complete";

  return (
    <div className="min-h-screen flex">
      {/* Left side - Progress */}
      <div className="hidden lg:flex lg:w-80 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col p-8 text-white w-full">
          <div className="mb-12">
            <Logo linkTo="/" size="md" inverted />
          </div>

          {/* Progress steps */}
          <div className="flex-1">
            <div className="space-y-4">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 ${
                    index === currentStep
                      ? "text-white"
                      : index < currentStep
                      ? "text-indigo-200"
                      : "text-indigo-300/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === currentStep
                        ? "bg-white text-indigo-600"
                        : index < currentStep
                        ? "bg-indigo-400 text-white"
                        : "bg-indigo-500/30"
                    }`}
                  >
                    {index < currentStep ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="font-medium">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-indigo-200">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>
      </div>

      {/* Right side - Content */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Mobile header */}
        <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <Logo linkTo="/" forceDark size="sm" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Step {currentStep + 1}/{STEPS.length}
            </span>
          </div>
          {/* Mobile progress bar */}
          <div className="h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {renderStepContent()}

            {/* Navigation buttons */}
            {!isComplete && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                {isLastContentStep ? (
                  <button
                    type="button"
                    onClick={completeOnboarding}
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Finishing...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                  >
                    Continue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {isComplete && (
              <div className="mt-8">
                <button
                  type="button"
                  onClick={goToDashboard}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                  Go to Dashboard
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
