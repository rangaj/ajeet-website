import { useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearRecoveryPending } from "@/lib/auth-recovery";
import { resolveNavDisplayName } from "@/lib/display-text";
import type { Profile } from "@/types/database";

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  navDisplayName: string;
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
  const [memberName, setMemberName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const [{ data: profileData }, { data: memberData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("alumni_members").select("name").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile(profileData);
    setMemberName(memberData?.name ?? null);
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
      else {
        setProfile(null);
        setMemberName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isApprovedAlumni =
    profile?.role === "alumni" && profile?.member_status === "approved";
  const canAccessDirectory = isAdmin || isApprovedAlumni;

  const signOut = useCallback(async () => {
    clearRecoveryPending();
    await supabase.auth.signOut();
    setProfile(null);
    setMemberName(null);
  }, []);

  const navDisplayName = user
    ? resolveNavDisplayName({
        memberName,
        metadataName:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user.user_metadata?.name === "string"
              ? user.user_metadata.name
              : null,
        email: user.email,
      })
    : "";

  return {
    user,
    session,
    profile,
    navDisplayName,
    loading,
    isAdmin,
    isApprovedAlumni,
    canAccessDirectory,
    refreshProfile,
    signOut,
  };
}
