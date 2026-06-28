import { useEffect, useState } from "react";
import { fetchMyMembershipSummary } from "@/lib/membership";
import type { MemberStanding, MembershipSummary } from "@/types/database";
import { Badge, Card } from "@/components/ui/Card";

const STANDING_META: Record<MemberStanding, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  active: { label: "Active member", variant: "success" },
  registered: { label: "Registered", variant: "warning" },
  in_default: { label: "Renewal due", variant: "danger" },
  none: { label: "Not a member yet", variant: "default" },
};

function formatMoney(currency: string | undefined, amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `${currency ?? "INR"} ${amount.toLocaleString()}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * Member-facing membership status. Renders nothing until the module is Live,
 * so it stays fully dark during the build/preview phase.
 */
export function MembershipStatusCard() {
  const [summary, setSummary] = useState<MembershipSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMyMembershipSummary().then(({ data }) => {
      if (!cancelled) setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!summary || summary.module_state !== "live" || !summary.has_member) {
    return null;
  }

  const standing = summary.standing ?? "none";
  const meta = STANDING_META[standing];
  const isHonorary = summary.member_type === "honorary" || summary.member_type === "patron";

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-slate-900">AAA Membership</h2>
        <Badge variant={isHonorary ? "gold" : meta.variant}>
          {isHonorary
            ? summary.member_type === "patron"
              ? "Patron member"
              : "Honorary member"
            : meta.label}
        </Badge>
      </div>

      {isHonorary ? (
        <p className="text-sm text-slate-600">
          You are a standing member of the Association by Executive Committee resolution.
        </p>
      ) : standing === "active" ? (
        <p className="text-sm text-slate-600">
          Your membership is active through <strong>{formatDate(summary.valid_through)}</strong>.
          {summary.voting_exempt ? " You are exempt from suspension for non-payment." : ""}
        </p>
      ) : (
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            {standing === "in_default"
              ? "Your membership has lapsed. Renew to keep your voting rights."
              : "Become a member of the Association to take part in governance and voting."}
          </p>
          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
            <div>
              <dt className="text-slate-500">Registration</dt>
              <dd className="font-medium text-slate-800">{formatMoney(summary.currency, summary.fee_registration)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Initial</dt>
              <dd className="font-medium text-slate-800">{formatMoney(summary.currency, summary.fee_initial)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Renewal</dt>
              <dd className="font-medium text-slate-800">{formatMoney(summary.currency, summary.fee_renewal)}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">
            To pay, please contact the Association treasurer.
            {summary.voting_exempt ? " Note: you are currently exempt from suspension for non-payment." : ""}
          </p>
        </div>
      )}
    </Card>
  );
}
