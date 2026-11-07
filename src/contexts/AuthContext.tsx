import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { firstTouch } from "@/lib/attribution";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

type UserRole = "super_admin" | "agency_owner" | "client";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  agencyId?: string;
  clientId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  viewAsClient: (clientId: string) => void;
  exitClientView: () => void;
  isViewingAsClient: boolean;
  viewedClientId: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

async function fetchProfile(userId: string): Promise<User | null> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("fetchProfile error:", profileError);
      return null;
    }
    if (!profile) return null;

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("fetchRoles error:", rolesError);
    }

    const role: UserRole = roles?.some(r => (r.role as string) === "super_admin")
      ? "super_admin"
      : roles?.some(r => r.role === "agency_owner")
        ? "agency_owner"
        : "client";

    return {
      id: userId,
      email: profile.email,
      fullName: profile.full_name,
      role,
      avatarUrl: profile.avatar_url ?? undefined,
      agencyId: profile.agency_id ?? undefined,
      clientId: profile.client_id ?? undefined,
    };
  } catch (err) {
    console.error("fetchProfile unexpected error:", err);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewedClientId, setViewedClientId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Safety timeout - never stay loading for more than 5 seconds
    const timeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn("Auth loading timeout - forcing completion");
        setIsLoading(false);
      }
    }, 5000);

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          try {
            const profile = await fetchProfile(session.user.id);
            if (mounted) setUser(profile);
          } catch {
            if (mounted) setUser(null);
          }
        }
      } catch {
        // Session fetch failed, proceed unauthenticated
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log("Auth state change:", event, session?.user?.id);
      if (event === 'INITIAL_SESSION') return;
      
      // Defer profile fetch to avoid auth state lock deadlock
      setTimeout(async () => {
        if (!mounted) return;
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          console.log("Profile after auth change:", profile);
          if (mounted) {
            setUser(profile);
            setIsLoading(false);
          }
        } else {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    toast.success("Welcome back!");
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // signup_domain: which brand's website the account came from (shown to super admins).
        data: { full_name: fullName, signup_domain: window.location.hostname, attribution: firstTouch() },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
    toast.success("Account created! Check your email to confirm.");
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setViewedClientId(null);
    toast.success("Logged out successfully");
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    toast.success(`Password reset link sent to ${email}`);
  }, []);

  const resetPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    toast.success("Password updated successfully!");
  }, []);

  const viewAsClient = useCallback((clientId: string) => {
    setViewedClientId(clientId);
  }, []);

  const exitClientView = useCallback(() => {
    setViewedClientId(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === "super_admin",
      isLoading,
      login, signup, logout, forgotPassword, resetPassword,
      viewAsClient, exitClientView,
      isViewingAsClient: !!viewedClientId,
      viewedClientId,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
