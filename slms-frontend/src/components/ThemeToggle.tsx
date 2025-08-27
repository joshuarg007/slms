import { useTheme } from "@/utils/theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  return (
    <button
      onClick={() => setTheme(next)}
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50
                 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      title={`Theme: ${label} (click to switch)`}
    >
      Theme: {label}
    </button>
  );
}
