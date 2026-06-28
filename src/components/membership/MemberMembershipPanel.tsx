import { useEffect, useState } from "react";
import { fetchAdminMemberMembership } from "@/lib/membership";
import type { AdminMembershipSummary, MemberStanding } from "@/types/database";
import { Badge, Card } from "@/components/ui/Card";

const STANDING_META: Record<MemberStanding, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  registered: { label: "Registered", variant: "warning" },
  in_default: { label: "In default", variant: "danger" },
  none: { label: "Not a member", variant: "default" },
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Membership status for the member being viewed in the support console.
 * Renders nothing unless the caller can manage the (dark) membership module.
 */
export function MemberMembershipPanel({ alumniMemberId }: { alumniMemberId: string }) {
  const [summary, setSummary] = useState<AdminMembershipSummary | null>(null);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setAllowed(true);
    void fetchAdminMemberMembership(alumniMemberId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setAllowed(false);
        return;
      }
      setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, [alumniMemberId]);

  if (!allowed || !summary) return null;

  const meta = STANDING_META[summary.standing];
  const isHonorary = summary.member_type !== "ajeet";

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Membership
        </h3>
        <Badge variant={isHonorary ? "gold" : meta.variant}>
          {isHonorary ? summary.member_type : meta.label}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Registration fee</dt>
          <dd className="text-slate-800">{summary.registration_fee_paid ? "Paid" : "Not paid"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Valid through</dt>
          <dd className="text-slate-800">{formatDate(summary.valid_through)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Current FY</dt>
          <dd className="text-slate-800">{summary.current_period_fy ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Voting exempt</dt>
          <dd className="text-slate-800">{summary.voting_exempt ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </Card>
  );
}
