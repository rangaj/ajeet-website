import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, ExternalLink, RefreshCw, Share2 } from "lucide-react";
import {
  getOrCreateShareLink,
  regenerateShareLink,
  type ShareLinkType,
} from "@/lib/data-access";
import { formatHousesWithLabel, formatRollNumber } from "@/lib/alumni-display";
import { profilePhotoToDataUrl } from "@/lib/photo-data-url";
import {
  captureShareCardImage,
  downloadShareCardImage,
  shareShareCardImage,
  whatsAppShareUrl,
} from "@/lib/share-card-image";
import { ShareCardVisual } from "@/components/share/ShareCardVisual";
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
    url,
  ].join("\n");
}

function contactShareMessage(member: AlumniMember, url: string) {
  const house = formatHousesWithLabel(member.house);
  return [
    `${member.name} — Ajeet Alumni Association`,
    `${formatRollNumber(member.roll_number)}${house ? ` · ${house}` : ""}`,
    url,
  ].join("\n");
}

function ShareLinkBlock({
  title,
  description,
  linkType,
  member,
  photoDataUrl,
  photoLoading = false,
}: {
  title: string;
  description: string;
  linkType: ShareLinkType;
  member: AlumniMember;
  photoDataUrl?: string | null;
  photoLoading?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [prepared, setPrepared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
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
    setPrepared(true);
  }, [linkType]);

  const url = token ? shareUrl(token) : "";
  const shareText =
    linkType === "network"
      ? token
        ? networkShareMessage(member, url)
        : ""
      : token
        ? contactShareMessage(member, url)
        : "";

  const cardData = {
    linkType,
    name: member.name,
    rollNumber: member.roll_number,
    house: member.house,
    courseEndYear: member.course_end_year,
    jobPosition: member.job_position,
    company: member.company,
    currentLocation: member.current_location,
    photoDataUrl,
  };

  const captureCard = async () => {
    if (photoLoading) {
      throw new Error("Profile photo is still loading. Wait a moment and try again.");
    }
    if (!cardRef.current) {
      throw new Error("Card preview not ready.");
    }
    return captureShareCardImage(cardRef.current);
  };

  const copyLink = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setMessage("Link copied.");
  };

  const shareCardImage = async () => {
    setImageBusy(true);
    setError("");
    try {
      const blob = await captureCard();
      const result = await shareShareCardImage(blob, {
        title:
          linkType === "network"
            ? "Join me on the Ajeet Alumni Network"
            : `${member.name} — Ajeet Alumni Card`,
        text: shareText,
      });
      setMessage(
        result === "shared"
          ? "Share sheet opened — pick WhatsApp or another app."
          : "Card image downloaded — attach it in WhatsApp or your social app."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share card image.");
    } finally {
      setImageBusy(false);
    }
  };

  const downloadCardImage = async () => {
    setImageBusy(true);
    setError("");
    try {
      const blob = await captureCard();
      downloadShareCardImage(blob, `ajeet-card-${member.roll_number}.png`);
      setMessage("Card image downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download card image.");
    } finally {
      setImageBusy(false);
    }
  };

  const openWhatsApp = () => {
    if (!url) return;
    window.open(whatsAppShareUrl(shareText), "_blank", "noopener,noreferrer");
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

  if (!prepared) {
    return (
      <Card className="space-y-3 p-5">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void loadToken()} disabled={loading}>
          {loading ? "Preparing…" : "Prepare share card"}
        </Button>
        {error && <Alert variant="error">{error}</Alert>}
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <div className="flex justify-center rounded-xl bg-slate-100 p-4">
        <div ref={cardRef}>
          <ShareCardVisual data={cardData} />
        </div>
      </div>

      {token && (
        <p className="break-all rounded-lg bg-warm-white px-3 py-2 font-mono text-xs text-slate-600">
          {url}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void shareCardImage()} disabled={!token || imageBusy || photoLoading}>
          <Share2 className="mr-1.5 h-4 w-4" />
          {imageBusy ? "Preparing…" : "Share card image"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void downloadCardImage()}
          disabled={!token || imageBusy || photoLoading}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download image
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void openWhatsApp()} disabled={!token}>
          WhatsApp (link)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void copyLink()} disabled={!token}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copy link
        </Button>
        {token && (
          <a href={url} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open card page
            </Button>
          </a>
        )}
        <Button size="sm" variant="ghost" onClick={() => void regenerate()} disabled={loading}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          New link
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        For WhatsApp groups, use Share card image on your phone (or download and attach the PNG).
        The link opens the live card page for anyone who taps it.
      </p>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
    </Card>
  );
}

export function ProfileShareSection({ member }: { member: AlumniMember }) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(Boolean(member.profile_photo_path));

  useEffect(() => {
    if (!member.profile_photo_path) {
      setPhotoDataUrl(null);
      setPhotoLoading(false);
      return;
    }

    let cancelled = false;
    setPhotoLoading(true);
    void profilePhotoToDataUrl(member.profile_photo_path).then((dataUrl) => {
      if (cancelled) return;
      setPhotoDataUrl(dataUrl);
      setPhotoLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [member.profile_photo_path]);

  if (member.status !== "approved") return null;

  return (
    <div className="space-y-4">
      <ShareLinkBlock
        title="Invite an Ajeet"
        description="Visual network card for batch WhatsApp groups, reunions, and LinkedIn posts."
        linkType="network"
        member={member}
        photoDataUrl={photoDataUrl}
        photoLoading={photoLoading}
      />
      <ShareLinkBlock
        title="Share contact card"
        description="Professional alumni card with your photo, batch, and career snapshot."
        linkType="contact"
        member={member}
        photoDataUrl={photoDataUrl}
        photoLoading={photoLoading}
      />
    </div>
  );
}
