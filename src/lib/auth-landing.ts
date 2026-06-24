import { supabase } from "@/lib/supabase";

/** Resolve where an authenticated user should land (directory vs pending). */
export async function resolvePostAuthPath(): Promise<"/directory" | "/pending"> {
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

  return isAdmin || isApproved ? "/directory" : "/pending";
}
