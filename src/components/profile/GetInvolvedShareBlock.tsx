import { useEffect, useRef, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import {
  formatGetInvolvedAreasForCard,
  GET_INVOLVED_SHARE_TEXT,
} from "@/constants/get-involved";
import { formatBatch, formatHousesWithLabel, formatRollNumber } from "@/lib/alumni-display";
import { formatDisplayShareName } from "@/lib/display-text";
import { profilePhotoToDataUrl } from "@/lib/photo-data-url";
import {
  captureShareCardImage,
  downloadShareCardImage,
  shareShareCardImage,
} from "@/lib/share-card-image";
import { appSiteUrl } from "@/lib/site-url";
import { GetInvolvedShareCardVisual } from "@/components/share/GetInvolvedShareCardVisual";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";
import type { AlumniMember } from "@/types/database";

function getInvolvedShareMessage(): string {
  return GET_INVOLVED_SHARE_TEXT.replace("https://new.ajeets.org", appSiteUrl());
}

export function GetInvolvedShareBlock({ member }: { member: AlumniMember }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const interestAreas = member.get_involved_interest_areas ?? [];
  const { shown, extraCount } = formatGetInvolvedAreasForCard(interestAreas);

  const cardData = {
    name: member.name,
    batch: formatBatch(member.course_end_year),
    rollNumber: formatRollNumber(member.roll_number),
    house: formatHousesWithLabel(member.house),
    houseValue: member.house,
    photoDataUrl,
    interestAreas: shown,
    extraAreaCount: extraCount,
  };

  useEffect(() => {
    if (!member.profile_photo_path) {
      setPhotoDataUrl(null);
      return;
    }

    let cancelled = false;
    void profilePhotoToDataUrl(member.profile_photo_path).then((dataUrl) => {
      if (!cancelled) setPhotoDataUrl(dataUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [member.profile_photo_path]);

  const captureCard = async () => {
    if (!cardRef.current) {
      throw new Error("Card preview not ready.");
    }
    return captureShareCardImage(cardRef.current);
  };

  const copyShareText = async () => {
    await navigator.clipboard.writeText(getInvolvedShareMessage());
    setMessage("Share text copied.");
    setError("");
  };

  const downloadImage = async () => {
    setImageBusy(true);
    setError("");
    try {
      const blob = await captureCard();
      const safeName = formatDisplayShareName(member.name).replace(/\s+/g, "-").toLowerCase();
      downloadShareCardImage(blob, `ajeet-get-involved-${safeName}.png`);
      setMessage("Card downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download card.");
    } finally {
      setImageBusy(false);
    }
  };

  const shareNative = async () => {
    setImageBusy(true);
    setError("");
    try {
      const blob = await captureCard();
      const result = await shareShareCardImage(blob, {
        title: "Get Involved — Ajeet Alumni Association",
        text: getInvolvedShareMessage(),
      });
      setMessage(result === "shared" ? "Shared." : "Card downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share card.");
    } finally {
      setImageBusy(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className="space-y-4 rounded-xl border border-surface-border bg-warm-white p-4">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-900">
          Create My Get Involved Card
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Share your commitment to support AAA initiatives — understated and professional.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border bg-slate-100 p-4">
        <div ref={cardRef} className="mx-auto w-fit">
          <GetInvolvedShareCardVisual data={cardData} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={imageBusy}
          onClick={() => void downloadImage()}
        >
          <Download className="mr-1.5 h-4 w-4" />
          Download image
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => void copyShareText()}>
          <Copy className="mr-1.5 h-4 w-4" />
          Copy share text
        </Button>
        {typeof navigator.share === "function" && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={imageBusy}
            onClick={() => void shareNative()}
          >
            <Share2 className="mr-1.5 h-4 w-4" />
            Share
          </Button>
        )}
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
