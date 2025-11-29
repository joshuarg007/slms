// Standard inline form component
import React, { useState, useCallback } from "react";

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

interface InlineFormProps {
  config: FormConfig;
  onSubmit: (data: Record<string, string>) => Promise<{ success: boolean; message?: string }>;
}

export function InlineForm({ config, onSubmit }: InlineFormProps) {
  const { styling, branding, fields } = config;
  const enabledFields = fields.filter((f) => f.enabled);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
    maxWidth: "480px",
    margin: "0 auto",
    padding: "24px",
    backgroundColor: "#fff",
    borderRadius: styling.borderRadius,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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

  const buttonStyle: React.CSSProperties = {
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
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 600, color: "#111827" }}>
        {branding.headerText}
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#6b7280" }}>
        {branding.subheaderText}
      </p>

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

          <button type="submit" disabled={submitting} style={buttonStyle}>
            {submitting ? "Submitting..." : branding.submitButtonText}
          </button>
        </div>
      </form>

      {branding.showPoweredBy && (
        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>
          Powered by Site2CRM
        </p>
      )}
    </div>
  );
}
