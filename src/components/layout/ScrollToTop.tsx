import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

function scrollWindowToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Reset scroll position on client-side navigation (e.g. footer links). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    scrollWindowToTop();
  }, [pathname, hash]);

  return null;
}
