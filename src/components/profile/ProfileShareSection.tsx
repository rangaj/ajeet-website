import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import {
  getOrCreateShareLink,
  regenerateShareLink,
  type ShareLinkType,
} from "@/lib/data-access";
import { formatHousesWithLabel, formatRollNumber } from "@/lib/alumni-display";
import { Button } from "@/components/ui/Button";
import { Alert, Card } from "@/components/ui/Card";
import type { AlumniMember } from "@/types/database";

function shareUrl(token: string) {
  return `${window.location.origin}/card/${token}`;
}

function networkShareMessage(member: AlumniMember, url: string) {
  const house = formatHousesWithLabel(member.house);
  return [
    "I'm on the Ajeet Alumni Network — Sainik School Bijapur alumni connecting worldwide.",
    `${member.name} · ${formatRollNumber(member.roll_number)}${house ? ` · ${house}` : ""}`,
    `Claim or join to connect with other Ajeets: ${url}`,
  ].join("\n");
}

function contactShareMessage(member: AlumniMember, url: string) {
  const house = formatHousesWithLabel(member.house);
  return [
    `${member.name} — Ajeet Alumni Association`,
    `${formatRollNumber(member.roll_number)}${house ? ` · ${house}` : ""}`,
    `View my alumni card: ${url}`,
    "Join the network for full contact details.",
  ].join("\n");
}

function ShareLinkBlock({
  title,
  description,
  linkType,
  member,
}: {
  title: string;
  description: string;
  linkType: ShareLinkType;
  member: AlumniMember;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadToken = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await getOrCreateShareLink(linkType);
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setToken(data as string);
  }, [linkType]);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  const url = token ? shareUrl(token) : "";
  const shareText =
    linkType === "network"
      ? token
        ? networkShareMessage(member, url)
        : ""
      : token
        ? contactShareMessage(member, url)
        : "";

  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(shareText || url);
    setMessage("Copied to clipboard.");
  };

  const nativeShare = async () => {
    if (!url || !navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title:
          linkType === "network"
            ? "Join me on the Ajeet Alumni Network"
            : `${member.name} — Ajeet Alumni Card`,
        text: shareText,
        url,
      });
    } catch {
      // User cancelled share sheet.
    }
  };

  const regenerate = async () => {
    const ok = window.confirm(
      "Generate a new link? Previous links will stop working immediately."
    );
    if (!ok) return;

    setLoading(true);
    setError("");
    const { data, error: rpcError } = await regenerateShareLink(linkType);
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setToken(data as string);
    setMessage("New link generated.");
  };

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      {token && (
        <p className="break-all rounded-lg bg-warm-white px-3 py-2 font-mono text-xs text-slate-600">
          {url}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copyLink()} disabled={!token}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copy message
        </Button>
        <Button size="sm" onClick={() => void nativeShare()} disabled={!token}>
          <Share2 className="mr-1.5 h-4 w-4" />
          Share
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void regenerate()} disabled={loading}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          New link
        </Button>
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
    </Card>
  );
}

export function ProfileShareSection({ member }: { member: AlumniMember }) {
  if (member.status !== "approved") return null;

  return (
    <div className="space-y-4">
      <ShareLinkBlock
        title="Invite an Ajeet"
        description="Share that you're on the network — great for batch WhatsApp groups and reunions."
        linkType="network"
        member={member}
      />
      <ShareLinkBlock
        title="Share contact card"
        description="A professional alumni card with your identity and career snapshot. No email or phone on the public link."
        linkType="contact"
        member={member}
      />
    </div>
  );
}
