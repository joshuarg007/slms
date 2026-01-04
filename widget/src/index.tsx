// Widget entry point
// Reads config from script tag and renders the appropriate form style

import { createRoot } from "react-dom/client";
import { InlineForm } from "./components/InlineForm";
import { WizardForm } from "./components/WizardForm";
import { ModalForm } from "./components/ModalForm";
import { DrawerForm } from "./components/DrawerForm";

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
  form_style: "inline" | "wizard" | "modal" | "drawer";
  fields: FieldConfig[];
  styling: {
    primaryColor: string;
    borderRadius: string;
    fontFamily: string;
  };
  branding: {
    showPoweredBy: boolean;
    headerText: string;
    subheaderText: string;
    submitButtonText: string;
    successMessage: string;
  };
}

// Find the script tag and extract config
function getScriptConfig(): { orgKey: string; containerId: string; apiBase: string; source: string } | null {
  const scripts = document.querySelectorAll("script[data-org-key]");
  const script = scripts[scripts.length - 1] as HTMLScriptElement | undefined;

  if (!script) {
    console.error("SLMS Widget: Missing data-org-key attribute");
    return null;
  }

  const orgKey = script.getAttribute("data-org-key");
  const containerId = script.getAttribute("data-container") || "slms-form";
  // Source tracking: identify which website the lead came from
  const source = script.getAttribute("data-source") || window.location.hostname;

  // Determine API base from script src or default
  let apiBase = "";
  try {
    const src = script.src;
    if (src) {
      const url = new URL(src);
      apiBase = url.origin;
    }
  } catch {
    // Use relative path if we can't parse
  }

  if (!orgKey) {
    console.error("SLMS Widget: data-org-key is required");
    return null;
  }

  return { orgKey, containerId, apiBase, source };
}

// Fetch form config from API
async function fetchFormConfig(apiBase: string, orgKey: string): Promise<FormConfig> {
  const url = `${apiBase}/api/public/forms/config/${orgKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch form config: ${res.status}`);
  }
  return res.json();
}

// Submit lead
async function submitLead(
  apiBase: string,
  orgKey: string,
  data: Record<string, string>,
  source: string
): Promise<{ success: boolean; message?: string }> {
  const url = `${apiBase}/api/public/leads`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Org-Key": orgKey,
      },
      body: JSON.stringify({ ...data, source }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.detail || "Submission failed" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, message: "Network error" };
  }
}

// Main widget component
function Widget({ config, apiBase, orgKey, source }: { config: FormConfig; apiBase: string; orgKey: string; source: string }) {
  const handleSubmit = async (data: Record<string, string>) => {
    return submitLead(apiBase, orgKey, data, source);
  };

  const commonProps = {
    config,
    onSubmit: handleSubmit,
  };

  switch (config.form_style) {
    case "wizard":
      return <WizardForm {...commonProps} />;
    case "modal":
      return <ModalForm {...commonProps} />;
    case "drawer":
      return <DrawerForm {...commonProps} />;
    case "inline":
    default:
      return <InlineForm {...commonProps} />;
  }
}

// Loading component
function Loading({ config }: { config?: FormConfig }) {
  const style = config?.styling || { primaryColor: "#2563eb", borderRadius: "10px" };
  return (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        color: "#666",
        fontFamily: "system-ui, -apple-system, sans-serif",
        borderRadius: style.borderRadius,
        border: "1px solid #e5e7eb",
      }}
    >
      Loading form...
    </div>
  );
}

// Error component
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "16px",
        color: "#b91c1c",
        backgroundColor: "#fef2f2",
        borderRadius: "8px",
        border: "1px solid #fecaca",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "14px",
      }}
    >
      {message}
    </div>
  );
}

// Initialize widget
async function init() {
  const scriptConfig = getScriptConfig();
  if (!scriptConfig) return;

  const { orgKey, containerId, apiBase, source } = scriptConfig;
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`SLMS Widget: Container #${containerId} not found`);
    return;
  }

  const root = createRoot(container);

  // Show loading state
  root.render(<Loading />);

  try {
    const config = await fetchFormConfig(apiBase, orgKey);
    root.render(<Widget config={config} apiBase={apiBase} orgKey={orgKey} source={source} />);
  } catch (err) {
    console.error("SLMS Widget error:", err);
    root.render(<ErrorDisplay message="Failed to load form. Please try again later." />);
  }
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
