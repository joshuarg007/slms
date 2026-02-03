// tailwind.config.js
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Semantic colors mapped to CSS variables */
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        border: {
          DEFAULT: "var(--border-color)",
        },
        brand: {
          red: "var(--brand-red)",
          "red-light": "var(--brand-red-light)",
          "red-dark": "var(--brand-red-dark)",
          gray: "var(--brand-gray)",
          "gray-light": "var(--brand-gray-light)",
          "gray-dark": "var(--brand-gray-dark)",
        },
        success: {
          bg: "var(--success-bg)",
          border: "var(--success-border)",
          text: "var(--success-text)",
        },
        warning: {
          bg: "var(--warning-bg)",
          border: "var(--warning-border)",
          text: "var(--warning-text)",
        },
        error: {
          bg: "var(--error-bg)",
          border: "var(--error-border)",
          text: "var(--error-text)",
        },
      },
      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,0.3)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      animation: {
        "fade-up": "fade-up 0.8s ease-out forwards",
        "fade-up-1": "fade-up 0.8s ease-out 0.15s forwards",
        "fade-up-2": "fade-up 0.8s ease-out 0.3s forwards",
        "fade-up-3": "fade-up 0.8s ease-out 0.45s forwards",
        "fade-up-4": "fade-up 0.8s ease-out 0.6s forwards",
        "fade-in": "fade-in 1s ease-out forwards",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
    },
  },
  plugins: [],
};
