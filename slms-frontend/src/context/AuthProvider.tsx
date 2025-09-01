// src/context/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/utils/api";

type User = { email: string } | null;

type AuthContextValue = {
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  // ✅ Set user immediately after login so ProtectedRoute can proceed
  const login = async (email: string, password: string) => {
    // 1) exchange creds for token (also sets localStorage in api.login)
    await api.login(email, password);

    // 2) immediately mark as signed in so routes stop redirecting
    setUser({ email });

    // 3) hydrate with /me in the background (don’t block navigation)
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        // if /me fails, keep minimal user (you still have a token)
      });
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

  const value: AuthContextValue = { user, loading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
