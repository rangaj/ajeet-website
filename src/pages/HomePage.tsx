import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Handshake, Heart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AAA_MOTTO } from "@/constants/brand";
import { SSBJ_BUILDING_SRC } from "@/components/brand/assets";
import { useAuth } from "@/hooks/useAuth";

const SNAPSHOT = [
  { value: "1963", label: "Founded" },
  { value: "60+ Years", label: "Of Legacy" },
  { value: "Global", label: "Community" },
  { value: "Verified", label: "Member Directory" },
] as const;

const FEATURES = [
  {
    icon: Users,
    title: "Connect",
    description: "Find classmates, batchmates, and fellow Ajeets around the world.",
  },
  {
    icon: Handshake,
    title: "Collaborate",
    description: "Build meaningful professional and personal relationships across generations.",
  },
  {
    icon: Sparkles,
    title: "Mentor",
    description: "Support students and younger Ajeets through guidance, opportunities, and experience.",
  },
  {
    icon: Heart,
    title: "Celebrate",
    description: "Share stories, achievements, reunions, and milestones with the wider community.",
  },
] as const;

function ClaimCtas({
  variant = "hero",
}: {
  variant?: "hero" | "footer";
}) {
  const { user, canAccessDirectory, isAdmin } = useAuth();
  const isHero = variant === "hero";

  if (user && isAdmin) {
    return (
      <Link to="/admin">
        <Button size="lg" variant="accent">
          Open Admin Console
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    );
  }

  if (user && canAccessDirectory) {
    return (
      <Link to="/directory">
        <Button size="lg" variant="accent">
          Open Directory
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    );
  }

  if (user) {
    return (
      <Link to="/pending">
        <Button size="lg" variant="accent">
          View Approval Status
        </Button>
      </Link>
    );
  }

  const ctaButtonWidth = "w-full min-w-[13.5rem] sm:w-auto";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
        <Link to="/claim" className="sm:inline-flex">
          <Button size="lg" variant="accent" className={ctaButtonWidth}>
            Claim My Ajeet ID
          </Button>
        </Link>
        <Link to="/register" className="sm:inline-flex">
          <Button size="lg" variant="outline" className={ctaButtonWidth}>
            Register as an Ajeet
          </Button>
        </Link>
      </div>
      {isHero && (
        <Link
          to="/login"
          className="text-sm font-medium text-gold-200/90 underline-offset-2 hover:text-white hover:underline"
        >
          Already registered? Sign In
        </Link>
      )}
    </div>
  );
}

export function HomePage() {
  const { loading, canAccessDirectory, isAdmin } = useAuth();

  if (!loading && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (!loading && canAccessDirectory) {
    return <Navigate to="/directory" replace />;
  }

  if (loading) {
    return <div className="min-h-[40vh] bg-warm-white" aria-hidden />;
  }

  return (
    <div className="bg-warm-white">
      {/* Hero — identity first, no building photo */}
      <section className="relative flex min-h-svh flex-col justify-center overflow-hidden bg-brand-900 pb-10 pt-[4.75rem] sm:pb-12 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,162,39,0.05),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <BrandLogo
            size="hero"
            className="w-[min(80vw,18rem)] max-w-none opacity-[0.02] sm:w-[24rem]"
          />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <BrandLogo size="hero" className="mx-auto w-[88px] sm:w-[128px]" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            Since 1963
          </p>
          <h1 className="mt-2 font-display text-[1.65rem] font-bold leading-snug text-white sm:text-[2rem] lg:text-[2.15rem]">
            One School.
            <br />
            Many Generations.
            <br />
            A Lifelong Connection.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-brand-100 sm:text-base">
            The Ajeet Alumni Association brings together a global community connected by shared
            experiences, enduring friendships, and the values forged at Sainik School Bijapur.
            Reconnect with classmates, discover fellow Ajeets across generations, and strengthen a
            network that continues to grow across professions, industries, and borders.
          </p>
          <div className="mt-6">
            <ClaimCtas variant="hero" />
          </div>
        </div>
      </section>

      {/* Community snapshot */}
      <section className="border-b border-surface-border py-10 sm:py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 sm:px-6 lg:grid-cols-4 lg:gap-6">
          {SNAPSHOT.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-surface-border bg-white px-4 py-6 text-center"
            >
              <p className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
                {item.value}
              </p>
              <p className="mt-1 text-sm font-medium text-brand-600">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What makes an Ajeet — building belongs here */}
      <section id="about" className="scroll-mt-24 py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[2fr_3fr] lg:gap-12">
          <div className="relative overflow-hidden rounded-2xl border border-surface-border shadow-card lg:max-w-md">
            <img
              src={SSBJ_BUILDING_SRC}
              alt="Sainik School Bijapur campus"
              className="aspect-[4/3] w-full object-cover saturate-[0.72] contrast-[0.88] brightness-[0.94]"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-brand-900/25 mix-blend-multiply"
              aria-hidden
            />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
              More Than Classmates.
              <br className="hidden sm:block" /> A Lifetime of Connection.
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-brand-700">
              <p>
                For generations, students at Sainik School Bijapur have learned, lived, and grown
                together during some of the most formative years of their lives.
              </p>
              <p>
                Those shared experiences create bonds that extend far beyond school—connecting Ajeets
                across professions, geographies, and generations.
              </p>
              <p>
                Today, the community continues to grow while remaining united by a shared identity,
                common values, and a spirit of service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why join — dark section */}
      <section id="why-join" className="scroll-mt-24 bg-brand-900 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Why Join the Network
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-5 w-5 text-gold-400" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-200">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legacy */}
      <section id="legacy" className="scroll-mt-24 py-14 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
            A Legacy That Continues to Grow
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-brand-700">
            <p>
              Founded in 1963, Sainik School Bijapur has shaped generations of leaders through
              discipline, character, and excellence.
            </p>
            <p>
              From its earliest days to the present, the institution has remained committed to
              developing confident, capable, and service-minded individuals.
            </p>
            <p>That legacy lives on through every Ajeet—past, present, and future.</p>
          </div>
        </div>
      </section>

      {/* Heritage */}
      <section
        id="heritage"
        className="scroll-mt-24 border-y border-gold-300/50 bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="font-display text-3xl font-semibold italic text-brand-900 sm:text-4xl">
            {AAA_MOTTO}
          </p>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-brand-600">
            A spirit of courage, character, and camaraderie that has united generations of Ajeets
            since 1963.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-900 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Once an Ajeet.
            <br />
            Always an Ajeet.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-brand-100 sm:text-lg">
            Reconnect with your community, strengthen lifelong relationships, and be part of the
            next chapter of the Ajeet story.
          </p>
          <div className="mt-8">
            <ClaimCtas variant="footer" />
          </div>
        </div>
      </section>
    </div>
  );
}
