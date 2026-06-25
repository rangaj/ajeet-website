import type { CSSProperties } from "react";
import { BrandLogo, BrandMotto } from "@/components/brand/BrandLogo";
import { ShareCardAvatar } from "@/components/share/ShareCardAvatar";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import {
  GET_INVOLVED_CARD_HEADLINE,
  GET_INVOLVED_CARD_INTEREST_LABEL,
  GET_INVOLVED_CARD_SUBLINE,
  GET_INVOLVED_CARD_WIDTH_PX,
} from "@/constants/get-involved";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { appSiteHostname } from "@/lib/site-url";
import { formatDisplayShareName } from "@/lib/display-text";
import { cn } from "@/lib/utils";

export type GetInvolvedShareCardData = {
  name: string;
  batch: string | null;
  rollNumber: string;
  house: string | null;
  houseValue?: string | null;
  photoDataUrl?: string | null;
  interestAreas: string[];
  extraAreaCount: number;
};

const cardRootStyle: CSSProperties = {
  width: GET_INVOLVED_CARD_WIDTH_PX,
  maxWidth: "100%",
  marginLeft: "auto",
  marginRight: "auto",
  display: "block",
  boxSizing: "border-box",
};

const memberNameStyle: CSSProperties = {
  display: "block",
  fontSize: 18,
  fontWeight: 600,
  lineHeight: "26px",
  color: "#0f172a",
  wordBreak: "break-word",
  paddingLeft: 8,
  paddingRight: 8,
};

const memberSublineStyle: CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 11,
  lineHeight: "16px",
  color: "#64748b",
  paddingLeft: 12,
  paddingRight: 12,
};

const identityLineStyle: CSSProperties = {
  display: "block",
  fontSize: 14,
  lineHeight: "22px",
  color: "#854d0e",
};

export function GetInvolvedShareCardVisual({
  data,
  className,
}: {
  data: GetInvolvedShareCardData;
  className?: string;
}) {
  const displayName = formatDisplayShareName(data.name);
  const houses = parseHouses(data.houseValue ?? data.house);
  const accent = houses.length === 1 ? getHouseColor(houses[0]) : "#c9a227";
  const identityLines = [data.batch, data.rollNumber, data.house].filter(Boolean);

  return (
    <div
      className={cn("overflow-hidden rounded-2xl bg-white", className)}
      style={{ ...cardRootStyle, borderTop: `4px solid ${accent}` }}
    >
      <div
        style={{
          backgroundColor: "#1e3a5f",
          padding: "16px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-block", lineHeight: 0 }}>
          <BrandLogo size="sm" />
        </div>
        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#fde68a",
          }}
        >
          Ajeet Alumni Association
        </p>
      </div>

      <div style={{ padding: "20px", boxSizing: "border-box" }}>
        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: "24px",
            color: "#1e3a5f",
          }}
        >
          {GET_INVOLVED_CARD_HEADLINE.line1}
          <br />
          <span style={{ color: "#b45309" }}>{GET_INVOLVED_CARD_HEADLINE.line2}</span>
        </p>

        <div
          style={{
            marginTop: 20,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            backgroundColor: "#faf9f7",
            padding: "16px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <ShareCardAvatar
              name={data.name}
              houseValue={data.houseValue ?? data.house}
              photoDataUrl={data.photoDataUrl}
              size="xl"
              className="mx-auto"
            />
          </div>

          <span style={memberNameStyle}>{displayName}</span>
          {houses.length > 0 && (
            <div style={{ marginTop: 6, textAlign: "center" }}>
              <HouseColorDots houseValue={data.houseValue ?? data.house} size="sm" />
            </div>
          )}
          <span style={memberSublineStyle}>{GET_INVOLVED_CARD_SUBLINE}</span>

          {identityLines.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {identityLines.map((line) => (
                <span key={line} style={identityLineStyle}>
                  {line}
                </span>
              ))}
            </div>
          )}
        </div>

        {data.interestAreas.length > 0 && (
          <div
            style={{
              marginTop: 16,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              padding: "12px 16px",
              boxSizing: "border-box",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              {GET_INVOLVED_CARD_INTEREST_LABEL}
            </p>
            <ul
              style={{
                margin: "8px 0 0",
                padding: 0,
                listStyle: "none",
                fontSize: 14,
                lineHeight: "22px",
                color: "#1e293b",
              }}
            >
              {data.interestAreas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
            {data.extraAreaCount > 0 && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
                + {data.extraAreaCount} more area{data.extraAreaCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#faf9f7",
          padding: "16px 20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <BrandLogo size="sm" />
          <div
            style={{
              margin: 0,
              textAlign: "center",
              fontSize: 12,
              lineHeight: "18px",
              fontWeight: 600,
              color: "#1e3a5f",
            }}
          >
            Sainik School Bijapur · Ajeet Alumni Association
          </div>
        </div>
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <BrandMotto variant="default" className="font-display text-sm font-semibold text-brand-900" />
        </div>
        <p
          style={{
            margin: "8px 0 0",
            textAlign: "center",
            fontSize: 11,
            lineHeight: "16px",
            color: "#94a3b8",
          }}
        >
          {appSiteHostname()}
        </p>
      </div>
    </div>
  );
}
