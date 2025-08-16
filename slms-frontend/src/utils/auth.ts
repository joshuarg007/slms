// src/auth.ts

// Optional helpers if you later add login flows
export function setAccessToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function getAccessToken(): string {
  return localStorage.getItem("access_token") || "";
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/";
}
