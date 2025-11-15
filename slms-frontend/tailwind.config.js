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
    },
  },
  plugins: [],
};
