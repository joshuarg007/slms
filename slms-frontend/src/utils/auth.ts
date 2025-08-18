// src/utils/auth.ts
// With httpOnly cookies, JS can't read tokens; we rely on API responses.

export async function logout() {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
    await fetch(`${baseUrl}/logout`, { method: "POST", credentials: "include" });
  } catch {}
  window.location.href = "/login";
}
