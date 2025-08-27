// src/utils/theme.ts
import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const THEME_KEY = "slms.theme";

export function getSavedTheme(): Theme {
  const raw = (typeof window !== "undefined" && localStorage.getItem(THEME_KEY)) as Theme | null;
  return raw ?? "system";
}

function resolve(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }
  return theme;
}

export function applyTheme(theme: Theme) {
  const mode = resolve(theme);
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

export function initTheme() {
  const theme = getSavedTheme();
  applyTheme(theme);

  // keep in sync if user selected "system"
  if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    try {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } catch {
      // Safari
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }
  return () => {};
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getSavedTheme());

  useEffect(() => {
    const off = initTheme();
    return off;
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, setTheme };
}
