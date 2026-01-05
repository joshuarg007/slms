// src/context/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api, { CurrentUser } from "@/utils/api";

type User = CurrentUser | null;

type AuthContextValue = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists, hydrate user; otherwise mark as not loading
  useEffect(() => {
    let mounted = true;
    const token =
      typeof localStorage !== "undefined" && localStorage.getItem("access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh user data from server
  const refreshUser = async () => {
    try {
      const u = await api.me();
      setUser(u);
    } catch {
      // Keep current user if refresh fails
    }
  };

  // ✅ Set user immediately after login so ProtectedRoute can proceed
  const login = async (email: string, password: string) => {
    // 1) exchange creds for token (also sets localStorage in api.login)
    await api.login(email, password);

    // 2) fetch full user data including org
    const u = await api.me();
    setUser(u);
  };

  // Clear both cookies/token and in-memory user
  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();    // clears cookies on server
    } finally {
      api.clearToken();      // removes access_token from localStorage
      setUser(null);
      setLoading(false);
    }
  };

  const value: AuthContextValue = { user, loading, login, logout, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
