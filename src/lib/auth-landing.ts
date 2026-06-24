import { supabase } from "@/lib/supabase";
import { clearAdminDirectoryView } from "@/lib/admin-navigation";

/** Resolve where an authenticated user should land after sign-in. */
export async function resolvePostAuthPath(): Promise<"/admin" | "/directory" | "/pending"> {
  try {
    await supabase.rpc("link_approved_alumni_self");
  } catch {
    // Best-effort self-heal; landing path still resolves from profile.
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return "/pending";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, member_status")
    .eq("id", session.user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isApproved =
    profile?.role === "alumni" && profile?.member_status === "approved";

  if (isAdmin) {
    clearAdminDirectoryView();
    return "/admin";
  }
  if (isApproved) return "/directory";
  return "/pending";
}
