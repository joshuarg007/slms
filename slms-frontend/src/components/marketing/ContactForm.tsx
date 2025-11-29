// Marketing contact form - adapted wizard style
import { useState, useCallback } from "react";
import { getApiBase } from "@/utils/api";
import { useRecaptcha } from "@/hooks/useRecaptcha";

interface FormStep {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "email" | "tel" | "textarea";
  required: boolean;
}

const FORM_STEPS: FormStep[] = [
  { key: "name", label: "What's your name?", placeholder: "Ada Lovelace", type: "text", required: true },
  { key: "email", label: "What's your email?", placeholder: "ada@example.com", type: "email", required: true },
  { key: "company", label: "What company are you with?", placeholder: "Acme Inc.", type: "text", required: false },
  { key: "message", label: "How can we help you?", placeholder: "Tell us about your project or questions...", type: "textarea", required: false },
];

interface ContactFormProps {
  onSubmit?: (data: Record<string, string>) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export default function ContactForm({
  onSubmit,
  title = "Get in Touch",
  subtitle = "We'd love to hear from you. Fill out the form and we'll get back to you shortly.",
}: ContactFormProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [direction, setDirection] = useState(1);
  const { executeRecaptcha, isEnabled: recaptchaEnabled } = useRecaptcha();

  const totalSteps = FORM_STEPS.length;
  const currentField = FORM_STEPS[step];
  const progress = Math.round(((step + 1) / (totalSteps + 1)) * 100);
  const isSummary = step === totalSteps;

  const handleChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canContinue = useCallback(() => {
    if (!currentField) return true;
    const value = formData[currentField.key] || "";
    return !currentField.required || value.trim().length > 0;
  }, [currentField, formData]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canContinue() && !isSummary && currentField?.type !== "textarea") {
      e.preventDefault();
      next();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);
    try {
      // Get reCAPTCHA token if enabled
      let captchaToken: string | null = null;
      if (recaptchaEnabled) {
        captchaToken = await executeRecaptcha("contact");
      }

      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default: submit to contact API endpoint
        const res = await fetch(`${getApiBase()}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            company: formData.company || null,
            message: formData.message || null,
            source: window.location.pathname,
            captcha_token: captchaToken,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 429) {
            throw new Error(data.detail?.message || "Too many requests. Please try again later.");
          }
          throw new Error(data.detail?.message || "Failed to submit");
        }
      }
      setStatus({ type: "success", message: "Thanks! We'll be in touch soon." });
      setFormData({});
      setStep(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setStatus({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  if (status?.type === "success") {
    return (
      <div className="max-w-xl mx-auto p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Thank You!</h3>
          <p className="text-gray-600 dark:text-gray-400">{status.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">{subtitle}</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{progress}% complete</p>
        </div>
      </div>

      {/* Error message */}
      {status?.type === "error" && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {status.message}
        </div>
      )}

      {/* Form content */}
      <div
        key={isSummary ? "summary" : currentField.key}
        className="transition-opacity duration-200"
        style={{ opacity: 1 }}
      >
        {!isSummary ? (
          <>
            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              Step {step + 1} of {totalSteps}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {currentField.label}
              {currentField.required && <span className="text-red-500 ml-1">*</span>}
            </h3>

            {currentField.type === "textarea" ? (
              <textarea
                value={formData[currentField.key] || ""}
                onChange={(e) => handleChange(currentField.key, e.target.value)}
                placeholder={currentField.placeholder}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                autoFocus
              />
            ) : (
              <input
                type={currentField.type}
                value={formData[currentField.key] || ""}
                onChange={(e) => handleChange(currentField.key, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentField.placeholder}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={back}
                disabled={step === 0}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canContinue()}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Review</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Review your information
            </h3>

            <div className="space-y-3 mb-6">
              {FORM_STEPS.map((field) => (
                <div key={field.key} className="flex text-sm">
                  <span className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400">{field.label.replace("?", "")}</span>
                  <span className="text-gray-900 dark:text-white">{formData[field.key] || "—"}</span>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(totalSteps - 1)}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60 transition-colors"
              >
                {submitting ? "Sending..." : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        Powered by Site2CRM
        {recaptchaEnabled && (
          <>
            <br />
            <span className="text-[10px]">
              Protected by reCAPTCHA.{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700 dark:hover:text-gray-300">Privacy</a>
              {" "}&{" "}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700 dark:hover:text-gray-300">Terms</a>
            </span>
          </>
        )}
      </p>
    </div>
  );
}
