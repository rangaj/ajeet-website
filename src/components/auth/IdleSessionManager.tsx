import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ADMIN_IDLE_TIMEOUT_MS,
  IDLE_SESSION_MESSAGE,
  IDLE_WARNING_BEFORE_MS,
  MEMBER_IDLE_TIMEOUT_MS,
} from "@/constants/session";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;
const ACTIVITY_THROTTLE_MS = 1000;

export function IdleSessionManager() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const idleTimeoutMs = isAdmin ? ADMIN_IDLE_TIMEOUT_MS : MEMBER_IDLE_TIMEOUT_MS;

  const handleLogout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    await signOut();
    navigate("/login", {
      replace: true,
      state: { sessionMessage: IDLE_SESSION_MESSAGE },
    });
  }, [clearTimers, navigate, signOut]);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    const warningDelay = Math.max(idleTimeoutMs - IDLE_WARNING_BEFORE_MS, 0);
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, warningDelay);

    logoutTimerRef.current = setTimeout(() => {
      void handleLogout();
    }, idleTimeoutMs);
  }, [clearTimers, handleLogout, idleTimeoutMs]);

  const staySignedIn = useCallback(() => {
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    scheduleTimers();

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityRef.current = now;
      scheduleTimers();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") onActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, scheduleTimers, clearTimers]);

  if (!user || !showWarning) return null;

  const warningMinutes = Math.round(IDLE_WARNING_BEFORE_MS / 60000);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-session-title"
    >
      <Card className="w-full max-w-md space-y-4 p-6 shadow-xl">
        <div className="space-y-2">
          <h2 id="idle-session-title" className="font-display text-lg font-semibold text-slate-900">
            Still there?
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            You have been inactive for a while. For your security, you will be signed out in about{" "}
            {warningMinutes} minutes unless you continue.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleLogout()}>
            Sign out now
          </Button>
          <Button type="button" onClick={staySignedIn}>
            Stay signed in
          </Button>
        </div>
      </Card>
    </div>
  );
}
