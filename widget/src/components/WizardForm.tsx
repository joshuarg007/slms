// Multi-step wizard form with Framer Motion animations
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface WizardFormProps {
  config: FormConfig;
  onSubmit: (data: Record<string, string>) => Promise<{ success: boolean; message?: string }>;
}

// Check for reduced motion preference
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export function WizardForm({ config, onSubmit }: WizardFormProps) {
  const { styling, branding, fields } = config;
  const enabledFields = useMemo(() => fields.filter((f) => f.enabled), [fields]);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [multiSelect, setMultiSelect] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const totalSteps = enabledFields.length;
  const currentField = enabledFields[step];
  const progress = Math.round(((step + 1) / (totalSteps + 1)) * 100);
  const isSummary = step === totalSteps;

  // Load draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("slms_form_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData || {});
        setMultiSelect(parsed.multiSelect || {});
      }
    } catch {
      // ignore
    }
  }, []);

  // Save draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("slms_form_draft", JSON.stringify({ formData, multiSelect }));
    } catch {
      // ignore
    }
  }, [formData, multiSelect]);

  const handleChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleMultiToggle = useCallback((fieldKey: string, option: string) => {
    setMultiSelect((prev) => {
      const current = prev[fieldKey] || [];
      const updated = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [fieldKey]: updated };
    });
  }, []);

  const canContinue = useCallback(() => {
    if (!currentField) return true;
    if (currentField.field_type === "multi") {
      return (multiSelect[currentField.key] || []).length > 0 || !currentField.required;
    }
    const value = formData[currentField.key] || "";
    return !currentField.required || value.trim().length > 0;
  }, [currentField, formData, multiSelect]);

  const next = useCallback(() => {
    if (step < totalSteps && canContinue()) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [step, totalSteps, canContinue]);

  const back = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  // Enter key support
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter" && canContinue() && !isSummary) {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [canContinue, next, isSummary]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);

    // Combine formData and multiSelect
    const submitData: Record<string, string> = { ...formData };
    for (const [key, values] of Object.entries(multiSelect)) {
      if (values.length > 0) {
        submitData[key] = values.join(", ");
      }
    }

    try {
      const result = await onSubmit(submitData);
      if (result.success) {
        setStatus({ type: "success", message: branding.successMessage });
        // Clear draft
        localStorage.removeItem("slms_form_draft");
        setFormData({});
        setMultiSelect({});
      } else {
        setStatus({ type: "error", message: result.message || "Submission failed" });
      }
    } catch {
      setStatus({ type: "error", message: "An error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: styling.fontFamily || "system-ui, -apple-system, sans-serif",
    maxWidth: "560px",
    margin: "0 auto",
    padding: "32px",
    backgroundColor: "#fff",
    borderRadius: styling.borderRadius,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: "16px",
    border: "1px solid #d1d5db",
    borderRadius: styling.borderRadius,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    border: "none",
    borderRadius: styling.borderRadius,
    cursor: "pointer",
  };

  const variants = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: direction * 20 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
        exit: { opacity: 0, x: direction * -20, transition: { duration: 0.18 } },
      };

  // If submitted successfully, show success message
  if (status?.type === "success") {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 16px",
              borderRadius: "50%",
              backgroundColor: "#d1fae5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 600, color: "#111827" }}>
            Thank You!
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>{status.message}</p>
        </div>
        {branding.showPoweredBy && (
          <p style={{ marginTop: "16px", textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
            Powered by Site2CRM
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 600, color: "#111827" }}>
          {branding.headerText}
        </h2>
        <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#6b7280" }}>
          {branding.subheaderText}
        </p>

        {/* Progress bar */}
        <div
          style={{
            height: "6px",
            backgroundColor: "#e5e7eb",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: styling.primaryColor,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div style={{ marginTop: "4px", fontSize: "12px", color: "#9ca3af" }}>{progress}%</div>
      </div>

      {/* Error message */}
      {status?.type === "error" && (
        <div
          style={{
            padding: "12px",
            marginBottom: "16px",
            borderRadius: styling.borderRadius,
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            fontSize: "14px",
          }}
        >
          {status.message}
        </div>
      )}

      {/* Form content */}
      <AnimatePresence mode="wait" initial={false}>
        {!isSummary ? (
          <motion.div key={currentField.key} {...variants}>
            <div style={{ marginBottom: "8px", fontSize: "13px", color: "#9ca3af" }}>
              Step {step + 1} of {totalSteps}
            </div>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 500, color: "#111827" }}>
              {currentField.label}
              {currentField.required && <span style={{ color: "#ef4444" }}> *</span>}
            </h3>

            {/* Field input based on type */}
            {currentField.field_type === "textarea" ? (
              <textarea
                value={formData[currentField.key] || ""}
                onChange={(e) => handleChange(currentField.key, e.target.value)}
                placeholder={currentField.placeholder}
                rows={5}
                style={{ ...inputStyle, resize: "vertical" }}
                autoFocus
              />
            ) : currentField.field_type === "select" ? (
              <select
                value={formData[currentField.key] || ""}
                onChange={(e) => handleChange(currentField.key, e.target.value)}
                style={inputStyle}
                autoFocus
              >
                <option value="">Select an option...</option>
                {currentField.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : currentField.field_type === "multi" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {currentField.options?.map((opt) => {
                  const isSelected = (multiSelect[currentField.key] || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleMultiToggle(currentField.key, opt)}
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        textAlign: "left",
                        border: isSelected ? `2px solid ${styling.primaryColor}` : "1px solid #d1d5db",
                        borderRadius: styling.borderRadius,
                        backgroundColor: isSelected ? `${styling.primaryColor}10` : "#fff",
                        color: "#374151",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                type={currentField.field_type}
                value={formData[currentField.key] || ""}
                onChange={(e) => handleChange(currentField.key, e.target.value)}
                placeholder={currentField.placeholder}
                style={inputStyle}
                autoFocus
              />
            )}

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                style={{
                  ...buttonStyle,
                  backgroundColor: "transparent",
                  border: "1px solid #d1d5db",
                  color: "#374151",
                  opacity: step === 0 ? 0.5 : 1,
                  cursor: step === 0 ? "not-allowed" : "pointer",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canContinue()}
                style={{
                  ...buttonStyle,
                  backgroundColor: styling.primaryColor,
                  color: "#fff",
                  opacity: canContinue() ? 1 : 0.5,
                  cursor: canContinue() ? "pointer" : "not-allowed",
                }}
              >
                Continue
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="summary" {...variants}>
            <div style={{ marginBottom: "8px", fontSize: "13px", color: "#9ca3af" }}>Summary</div>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 500, color: "#111827" }}>
              Review your information
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {enabledFields.map((field) => {
                const value =
                  field.field_type === "multi"
                    ? (multiSelect[field.key] || []).join(", ")
                    : formData[field.key] || "";
                return (
                  <div key={field.key} style={{ display: "flex", fontSize: "14px" }}>
                    <span style={{ width: "140px", flexShrink: 0, color: "#6b7280" }}>{field.label}</span>
                    <span style={{ color: "#111827" }}>{value || "—"}</span>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => setStep(totalSteps - 1)}
                style={{
                  ...buttonStyle,
                  backgroundColor: "transparent",
                  border: "1px solid #d1d5db",
                  color: "#374151",
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#059669",
                  color: "#fff",
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Sending..." : branding.submitButtonText}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {branding.showPoweredBy && (
        <p style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
          Powered by Site2CRM
        </p>
      )}
    </div>
  );
}
