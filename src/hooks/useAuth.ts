import { useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isApprovedAlumni: boolean;
  canAccessDirectory: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isApprovedAlumni =
    profile?.role === "alumni" && profile?.member_status === "approved";
  const canAccessDirectory = isAdmin || isApprovedAlumni;

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isApprovedAlumni,
    canAccessDirectory,
    refreshProfile,
    signOut,
  };
}
