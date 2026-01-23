// src/context/AuthContext.js
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/lib/client";
import { authService } from "@/services/authService";
import { getRoleConfig } from "@/lib/config/roles";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [roleConfig, setRoleConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        setLoading(true);

        const currentUser = await authService.getUser();
        if (cancelled) return;

        if (!currentUser) {
          setUser(null);
          setRoleConfig(null);
          setLoading(false);

          // AuthContext dipakai untuk area dashboard; kalau tidak ada user,
          // langsung arahkan ke login.
          router.replace("/login");
          return;
        }

        const roleRaw = currentUser?.profile?.role;
        const userRole = roleRaw ? String(roleRaw).toUpperCase() : null;

        setUser({ ...currentUser, role: userRole });
        setRoleConfig(getRoleConfig(userRole));
        setLoading(false);
      } catch (err) {
        console.error("AuthContext loadUser error:", err);
        if (cancelled) return;
        setUser(null);
        setRoleConfig(null);
        setLoading(false);
        router.replace("/login");
      }
    };

    // Initial load
    loadUser();

    // Keep state in-sync (login/logout in another tab, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      // Update state segera untuk menghindari UI stale.
      setUser(null);
      setRoleConfig(null);
      router.replace("/login");
    }
  };

  const value = useMemo(
    () => ({ user, roleConfig, loading, logout }),
    [user, roleConfig, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
