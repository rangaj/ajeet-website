import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPublicShareCard, type PublicShareCard } from "@/lib/data-access";
import { ShareCardVisual } from "@/components/share/ShareCardVisual";
import { Button } from "@/components/ui/Button";
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

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-6 sm:py-10">
      <ShareCardVisual
        data={{
          linkType: card.link_type,
          name: card.name,
          rollNumber: card.roll_number,
          house: card.house,
          courseEndYear: card.course_end_year,
          jobPosition: card.job_position,
          company: card.company,
          currentLocation: card.current_location,
        }}
        className="w-full max-w-[360px] shadow-2xl"
      />

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
