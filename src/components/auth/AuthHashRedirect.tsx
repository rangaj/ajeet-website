import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { resolvePostAuthPath } from "@/lib/auth-landing";
import {
  isRecoveryHash,
  isRecoveryPending,
  markRecoveryPending,
} from "@/lib/auth-recovery";

function hashType(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("type");
}

/** Route magic-link sign-in and password-recovery links to the right pages. */
export function AuthHashRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const sendToResetPassword = (replaceHash = false) => {
      markRecoveryPending();
      const { pathname, hash } = window.location;
      if (pathname === "/reset-password") return;
      if (replaceHash && hash.includes("access_token")) {
        window.location.replace(`/reset-password${hash}`);
        return;
      }
      navigate("/reset-password", { replace: true });
    };

    if (isRecoveryHash()) {
      sendToResetPassword(true);
      return;
    }

    const maybeRedirect = () => {
      if (isRecoveryPending()) {
        sendToResetPassword();
        return;
      }

      const { pathname, hash } = window.location;
      if (!hash.includes("access_token")) return;

      const type = hashType();

      if (type === "recovery") {
        sendToResetPassword(true);
        return;
      }

      if (pathname === "/" || pathname === "/login") {
        void resolvePostAuthPath().then((path) => navigate(path, { replace: true }));
      }
    };

    void supabase.auth.getSession().then(() => maybeRedirect());

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sendToResetPassword();
        return;
      }
      if (event === "SIGNED_IN") {
        maybeRedirect();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
