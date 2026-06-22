import { Link } from "react-router-dom";
import { ArrowRight, Handshake, Heart, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
    description: "Build meaningful professional and personal connections across generations.",
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

function HeroCtas() {
  const { user, canAccessDirectory } = useAuth();

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

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
      <Link to="/claim">
        <Button size="lg" variant="accent" className="w-full sm:w-auto">
          Claim My Ajeet ID
        </Button>
      </Link>
      <Link to="/register">
        <Button
          size="lg"
          variant="secondary"
          className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
        >
          Register as an Ajeet
        </Button>
      </Link>
      <Link
        to="/login"
        className="text-center text-sm font-medium text-gold-200 underline-offset-2 hover:text-white hover:underline sm:ml-2"
      >
        Already registered? Sign In
      </Link>
    </div>
  );
}

export function HomePage() {
  const { user, canAccessDirectory } = useAuth();

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative flex min-h-[min(88vh,52rem)] items-center">
        <img
          src={SSBJ_BUILDING_SRC}
          alt="Sainik School Bijapur campus"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-brand-900/58" aria-hidden />
        <div className="relative mx-auto w-full max-w-3xl px-4 pb-14 pt-28 text-center sm:px-6 sm:pb-16 sm:pt-36">
          <BrandLogo size="hero" className="mx-auto" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            Since 1963
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            The Global Home of Ajeets
          </h1>
          <div className="mx-auto mt-5 max-w-2xl space-y-3 text-base leading-relaxed text-brand-100 sm:text-lg">
            <p>
              Connect with classmates, discover fellow Ajeets across generations, and strengthen a
              lifelong connection built at Sainik School Bijapur.
            </p>
            <p className="text-brand-200/95">
              The Ajeet Alumni Association brings together a global community united by shared
              experiences, enduring friendships, and a commitment to helping one another succeed.
            </p>
          </div>
          <div className="mt-8 flex justify-center">
            <HeroCtas />
          </div>
        </div>
      </section>

      {/* Community snapshot */}
      <section className="border-b border-surface-border bg-white py-10 sm:py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:px-6 lg:grid-cols-4 lg:gap-8">
          {SNAPSHOT.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-surface-border bg-surface-muted/50 px-4 py-5 text-center"
            >
              <p className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
                {item.value}
              </p>
              <p className="mt-1 text-sm font-medium text-brand-600">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 */}
      <section id="about" className="scroll-mt-20 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
            More Than Classmates. A Lifetime of Connection.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-brand-700">
            <p>
              For generations, students at Sainik School Bijapur have learned, lived, and grown
              together during some of the most formative years of their lives.
            </p>
            <p>
              Those shared experiences create bonds that extend far beyond school—connecting Ajeets
              across generations, professions, and geographies.
            </p>
            <p>
              Today, the network continues to grow, bringing together alumni and future Ajeets
              through a shared identity, common values, and a spirit of service.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section id="why-join" className="scroll-mt-20 border-y border-surface-border bg-surface-muted py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold text-brand-900 sm:text-3xl">
            Why Join the Ajeet Network?
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-surface-border bg-white p-5 shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-brand-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 */}
      <section id="legacy" className="scroll-mt-20 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold text-brand-900 sm:text-3xl">
            A Legacy That Continues to Grow
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-brand-700">
            <p>
              Founded in 1963, Sainik School Bijapur has shaped generations of leaders through
              discipline, character, and excellence.
            </p>
            <p>
              From its early beginnings to its present-day campus, the institution has remained
              committed to developing confident, capable, and service-minded individuals.
            </p>
            <p>
              Today, that legacy continues through every Ajeet—past, present, and future.
            </p>
          </div>
        </div>
      </section>

      {/* Heritage */}
      <section id="heritage" className="scroll-mt-20 border-y border-gold-200/60 bg-gold-50/40 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="font-display text-2xl font-bold italic text-brand-900 sm:text-3xl">
            Ajeet Hain, Abheet Hain
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-700">
            A spirit of courage, character, and camaraderie that has united generations of Ajeets
            since 1963.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-900 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Once an Ajeet. Always an Ajeet.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-brand-100 sm:text-lg">
            Reconnect with your community, strengthen lifelong relationships, and be part of the
            next chapter of the Ajeet story.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user && canAccessDirectory ? (
              <Link to="/directory">
                <Button size="lg" variant="accent">
                  Open Directory
                </Button>
              </Link>
            ) : user ? (
              <Link to="/pending">
                <Button size="lg" variant="accent">
                  View Approval Status
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/claim">
                  <Button size="lg" variant="accent">
                    Claim My Ajeet ID
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="border-white/30 bg-transparent text-white hover:bg-white/10"
                  >
                    Register as an Ajeet
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
