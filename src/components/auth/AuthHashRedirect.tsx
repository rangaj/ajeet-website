import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

function hashType(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("type");
}

/** Route magic-link sign-in and password-recovery links to the right pages. */
export function AuthHashRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const maybeRedirect = () => {
      const { pathname, hash } = window.location;
      if (!hash.includes("access_token")) return;

      const type = hashType();

      if (type === "recovery") {
        if (pathname !== "/reset-password") {
          window.location.replace(`/reset-password${hash}`);
        }
        return;
      }

      if (pathname === "/" || pathname === "/login") {
        navigate("/pending", { replace: true });
      }
    };

    void supabase.auth.getSession().then(() => maybeRedirect());

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        maybeRedirect();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
