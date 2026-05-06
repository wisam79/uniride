import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export type UserRole = "student" | "driver" | "admin" | "unassigned";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  gender: "male" | "female" | null;
  role: UserRole;
  institution_id: string | null;
  is_activated: boolean;
  parent_name: string | null;
  parent_phone: string | null;
}

interface AuthContextValue {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  registerProfile: (data: {
    fullName: string;
    role: UserRole;
    institutionId?: string;
    parentName?: string;
    parentPhone?: string;
    vehicleInfo?: string;
    capacity?: number;
    monthlyFee?: number;
  }) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<Profile | null>>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function initializeAuth() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await loadUserProfile(session.user.id);
        }
      } catch (err: any) {
        setError(err?.message || "فشل تحميل الجلسة");
      }
      setIsLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      });
      authSubscription = subscription;
    }

    initializeAuth();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function loadUserProfile(userId: string) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      if (profile) {
        setUser(profile as Profile);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setError(err?.message || "فشل تحميل الملف الشخصي");
    }
  }

  async function signInWithEmail(email: string): Promise<void> {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({ email });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
  }

  async function verifyOtp(email: string, code: string): Promise<{ isNewUser: boolean }> {
    setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message);
      throw verifyError;
    }

      let isNewUser = false;
      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user!.id)
          .single();

        if (!profile || !profile.full_name || profile.full_name.trim() === "") {
          isNewUser = true;
        }
        if (profile) {
          setUser(profile as Profile);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }

    return { isNewUser };
  }

  async function signInWithGoogle(): Promise<void> {
    setError(null);
    const redirectUri = makeRedirectUri();
    const { data, error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (googleError) {
      setError(googleError.message);
      throw googleError;
    }

    if (data?.url) {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (res && res.type === "success") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } else {
        setError("تم إلغاء تسجيل الدخول");
      }
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
    setUser(null);
    setIsAuthenticated(false);
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (updateError) {
      setError(updateError.message);
      throw updateError;
    }
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }

  /**
   * Atomic registration: uses the `register_user_profile` RPC
   * which executes profile update + driver creation in a single transaction.
   * Falls back to sequential calls if RPC is unavailable.
   */
  async function registerProfile(data: {
    fullName: string;
    role: UserRole;
    institutionId?: string;
    parentName?: string;
    parentPhone?: string;
    vehicleInfo?: string;
    capacity?: number;
    monthlyFee?: number;
  }) {
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? user?.id;
    if (!userId) {
      setError("لم يتم العثور على جلسة المستخدم");
      return;
    }

    try {
      const { error: rpcError } = await supabase.rpc("register_user_profile", {
        p_user_id: userId,
        p_full_name: data.fullName,
        p_role: data.role,
        p_institution_id: data.institutionId || null,
        p_parent_name: data.parentName || null,
        p_parent_phone: data.parentPhone || null,
        p_vehicle_info: data.vehicleInfo || null,
        p_capacity: data.capacity ?? 4,
        p_monthly_fee: data.monthlyFee ?? 90000,
      });

      if (rpcError) throw rpcError;
    } catch {
      // Fallback: sequential with manual rollback
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          role: data.role,
          institution_id: data.institutionId || null,
          parent_name: data.parentName || null,
          parent_phone: data.parentPhone || null,
        })
        .eq("id", userId);
      if (profileError) {
        setError(profileError.message);
        throw profileError;
      }

      if (data.role === "driver") {
        const { error: driverError } = await supabase.from("drivers").insert({
          user_id: userId,
          vehicle_info: data.vehicleInfo || "غير محدد",
          capacity: data.capacity ?? 4,
          available_seats: data.capacity ?? 4,
          monthly_fee: data.monthlyFee,
          institution_id: data.institutionId || null,
        });
        if (driverError) {
          // Rollback profile update on driver creation failure
          await supabase
            .from("profiles")
            .update({ role: "unassigned", full_name: null, institution_id: null })
            .eq("id", userId);
          setError(driverError.message);
          throw driverError;
        }
      }
    }

    await loadUserProfile(userId);
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    signInWithEmail,
    signInWithGoogle,
    verifyOtp,
    signOut,
    updateProfile,
    registerProfile,
    setUser,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}