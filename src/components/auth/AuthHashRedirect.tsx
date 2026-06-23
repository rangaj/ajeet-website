import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/** After magic-link / OTP sign-in, send users to /pending instead of staying on homepage. */
export function AuthHashRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const maybeRedirect = () => {
      const { pathname, hash } = window.location;
      const fromEmailLink = hash.includes("access_token") || hash.includes("type=recovery");
      if (!fromEmailLink) return;
      if (pathname === "/" || pathname === "/login") {
        navigate("/pending", { replace: true });
      }
    };

    void supabase.auth.getSession().then(() => maybeRedirect());

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") maybeRedirect();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
