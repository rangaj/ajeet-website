import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
  getLatestEmployer,
} from "@/lib/alumni-display";
import { getPublicShareCard, type PublicShareCard } from "@/lib/data-access";
import { MemberAvatar } from "@/components/member/MemberAvatar";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import { BrandLogo, BrandMotto } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { useAuth } from "@/hooks/useAuth";

export function ShareCardPage() {
  const { token } = useParams();
  const { canAccessDirectory } = useAuth();
  const [card, setCard] = useState<PublicShareCard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Invalid share link.");
      setLoading(false);
      return;
    }

    void getPublicShareCard(token).then(({ data, error: rpcError }) => {
      setLoading(false);
      if (rpcError || !data?.length) {
        setError("This share link is invalid or has expired.");
        return;
      }
      setCard(data[0] as PublicShareCard);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-slate-500">
        Loading card…
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <p className="text-slate-600">{error || "Card not found."}</p>
        <Link to="/">
          <Button>Go to homepage</Button>
        </Link>
      </div>
    );
  }

  const batch = formatBatch(card.course_end_year);
  const house = formatHousesWithLabel(card.house);
  const houses = parseHouses(card.house);
  const accent = houses.length === 1 ? getHouseColor(houses[0]) : "#1e3a5f";
  const latestEmployer = getLatestEmployer(card.company);
  const isNetwork = card.link_type === "network";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-6 sm:py-10">
      <div
        className="w-full overflow-hidden rounded-2xl border border-surface-border bg-white shadow-2xl"
        style={{ borderTopWidth: 4, borderTopColor: accent }}
      >
        {isNetwork ? (
          <div className="bg-brand-900 px-6 py-8 text-center text-white">
            <BrandLogo size="sm" className="mx-auto mb-4" />
            <p className="font-display text-lg font-semibold">Ajeet Alumni Network</p>
            <BrandMotto variant="subtle" className="mt-1 text-gold-300" />
            <div className="mt-6 rounded-xl bg-white/10 px-4 py-5 backdrop-blur-sm">
              <MemberAvatar
                name={card.name}
                houseValue={card.house}
                size="xl"
                className="mx-auto"
              />
              <p className="mt-4 font-display text-xl font-bold">{card.name}</p>
              <p className="mt-1 text-sm text-gold-200">
                {[formatRollNumber(card.roll_number), house].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-brand-100">
                I&apos;m on the Ajeet Alumni Network. Claim or join to connect with fellow
                Sainik School Bijapur Ajeets and expand your network.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8">
            <div className="flex items-start gap-4">
              <MemberAvatar name={card.name} houseValue={card.house} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-bold text-slate-900">{card.name}</h1>
                  <HouseColorDots houseValue={card.house} size="md" />
                </div>
                <p className="mt-1 text-sm text-gold-700">
                  {[batch, formatRollNumber(card.roll_number), house].filter(Boolean).join(" · ")}
                </p>
                {card.job_position && (
                  <p className="mt-3 font-medium text-slate-900">{card.job_position}</p>
                )}
                {latestEmployer && <p className="text-sm text-slate-700">{latestEmployer}</p>}
                {card.current_location && (
                  <p className="mt-1 text-sm text-slate-500">{card.current_location}</p>
                )}
              </div>
            </div>
            <p className="mt-6 border-t border-surface-border pt-4 text-center text-xs text-slate-400">
              Sainik School Bijapur · Ajeet Alumni Association
            </p>
          </div>
        )}

        {!isNetwork && (
          <div className="border-t border-surface-border bg-warm-white px-6 py-4 text-center text-xs text-slate-500">
            Contact details available to verified Ajeets on the network.
          </div>
        )}
      </div>

      <div className="mt-8 flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to="/claim" className="sm:flex-1">
          <Button variant="accent" className="w-full">
            Claim your Ajeet ID
          </Button>
        </Link>
        <Link to="/register" className="sm:flex-1">
          <Button variant="secondary" className="w-full">
            Register as an Ajeet
          </Button>
        </Link>
      </div>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already on the network?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
        {canAccessDirectory && (
          <>
            {" "}
            ·{" "}
            <Link to="/directory" className="font-semibold text-brand-600 hover:text-brand-700">
              Open directory
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
