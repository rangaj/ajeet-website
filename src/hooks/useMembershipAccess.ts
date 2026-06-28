import { useEffect, useState } from "react";
import { canManageMembership, membershipIsLive } from "@/lib/membership";

export interface MembershipAccess {
  loading: boolean;
  canManage: boolean;
  isLive: boolean;
}

/**
 * Resolves whether the current user may see/operate the membership module.
 * The module ships dark: `canManage` is true only for super-admins and
 * trusted preview testers until the module is flipped live.
 */
export function useMembershipAccess(): MembershipAccess {
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([canManageMembership(), membershipIsLive()]).then(
      ([manageRes, liveRes]) => {
        if (cancelled) return;
        setCanManage(Boolean(manageRes.data));
        setIsLive(Boolean(liveRes.data));
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, canManage, isLive };
}
