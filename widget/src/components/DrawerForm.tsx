// Slide-in drawer form with Framer Motion animations
import React, { useState, useCallback } from "react";
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

interface DrawerConfig {
  triggerButtonText: string;
  position: "right" | "left";
  width: string;
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
  drawer?: DrawerConfig;
}

interface DrawerFormProps {
  config: FormConfig;
  onSubmit: (data: Record<string, string>) => Promise<{ success: boolean; message?: string }>;
}

// Check for reduced motion preference
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export function DrawerForm({ config, onSubmit }: DrawerFormProps) {
  const { styling, branding, fields, drawer } = config;
  const enabledFields = fields.filter((f) => f.enabled);

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const triggerText = drawer?.triggerButtonText || "Get in Touch";
  const position = drawer?.position || "right";
  const width = drawer?.width || "400px";

  const handleChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const result = await onSubmit(formData);
      if (result.success) {
        setStatus({ type: "success", message: branding.successMessage });
        setFormData({});
        // Auto close after success
        setTimeout(() => {
          setIsOpen(false);
          setStatus(null);
        }, 2000);
      } else {
        setStatus({ type: "error", message: result.message || "Submission failed" });
      }
    } catch {
      setStatus({ type: "error", message: "An error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger button positioned on the edge of screen
  const getTriggerStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "fixed",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 9998,
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: 600,
      color: "#fff",
      backgroundColor: styling.primaryColor,
      border: "none",
      cursor: "pointer",
      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
      fontFamily: styling.fontFamily || "system-ui, -apple-system, sans-serif",
      writingMode: "vertical-rl",
      textOrientation: "mixed",
    };

    if (position === "left") {
      return {
        ...base,
        left: 0,
        borderRadius: `0 ${styling.borderRadius} ${styling.borderRadius} 0`,
        transform: "translateY(-50%) rotate(180deg)",
      };
    }
    return {
      ...base,
      right: 0,
      borderRadius: `${styling.borderRadius} 0 0 ${styling.borderRadius}`,
    };
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: styling.borderRadius,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "4px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#374151",
  };

  const overlayVariants = prefersReducedMotion
    ? { hidden: {}, visible: {}, exit: {} }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.15 } },
      };

  const drawerVariants = prefersReducedMotion
    ? { hidden: {}, visible: {}, exit: {} }
    : {
        hidden: { x: position === "right" ? "100%" : "-100%" },
        visible: { x: 0, transition: { type: "spring", damping: 30, stiffness: 300 } },
        exit: { x: position === "right" ? "100%" : "-100%", transition: { duration: 0.2 } },
      };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        style={getTriggerStyle()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        {triggerText}
      </motion.button>

      {/* Drawer Overlay & Content */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                zIndex: 9998,
              }}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              style={{
                position: "fixed",
                top: 0,
                bottom: 0,
                [position]: 0,
                width,
                maxWidth: "100vw",
                backgroundColor: "#fff",
                boxShadow: "-4px 0 25px rgba(0,0,0,0.15)",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                fontFamily: styling.fontFamily || "system-ui, -apple-system, sans-serif",
              }}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 24px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#111827" }}>
                    {branding.headerText}
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6b7280" }}>
                    {branding.subheaderText}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: "24px",
                    lineHeight: 1,
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Form content - scrollable */}
              <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
                {status && (
                  <div
                    style={{
                      padding: "12px",
                      marginBottom: "16px",
                      borderRadius: styling.borderRadius,
                      backgroundColor: status.type === "success" ? "#d1fae5" : "#fee2e2",
                      color: status.type === "success" ? "#065f46" : "#991b1b",
                      fontSize: "14px",
                    }}
                  >
                    {status.message}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {enabledFields.map((field) => (
                      <div key={field.key}>
                        <label style={labelStyle}>
                          {field.label}
                          {field.required && <span style={{ color: "#ef4444" }}> *</span>}
                        </label>
                        {field.field_type === "textarea" ? (
                          <textarea
                            value={formData[field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            rows={4}
                            style={{ ...inputStyle, resize: "vertical" }}
                          />
                        ) : field.field_type === "select" ? (
                          <select
                            value={formData[field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            required={field.required}
                            style={inputStyle}
                          >
                            <option value="">Select...</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.field_type}
                            value={formData[field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            style={inputStyle}
                          />
                        )}
                      </div>
                    ))}

                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: "100%",
                        padding: "12px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#fff",
                        backgroundColor: styling.primaryColor,
                        border: "none",
                        borderRadius: styling.borderRadius,
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? "Submitting..." : branding.submitButtonText}
                    </button>
                  </div>
                </form>
              </div>

              {/* Footer */}
              {branding.showPoweredBy && (
                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid #e5e7eb",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                    Powered by Site2CRM
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
