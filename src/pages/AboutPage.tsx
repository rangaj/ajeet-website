import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AAA_MOTTO, PLATFORM_TAGLINE } from "@/constants/brand";
import { Card } from "@/components/ui/Card";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-surface-border pt-8 first:border-0 first:pt-0">
      <h2 className="font-display text-xl font-semibold text-brand-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">{children}</div>
    </section>
  );
}

export function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
        <div className="border-b border-gold-200/60 bg-gradient-to-br from-brand-900 to-brand-800 px-6 py-10 text-white sm:px-8">
          <BrandLogo size="sm" className="mb-4 opacity-95" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-300">
            Ajeets Alumni Association
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            Connecting Ajeets Across Generations
          </h1>
          <p className="mt-3 text-sm text-brand-100 sm:text-base">{PLATFORM_TAGLINE}</p>
        </div>

        <Card className="space-y-0 border-0 shadow-none sm:p-8">
          <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
            <p>
              The Ajeet Alumni Association (AAA) is the official alumni association of Sainik School
              Bijapur.
            </p>
            <p>
              Founded by Ajeets, for Ajeets, AAA exists to strengthen the lifelong bond among alumni
              of Sainik School Bijapur and to foster a vibrant, supportive, and connected community
              across generations.
            </p>
            <p>
              Our alumni serve across the armed forces, public service, business, entrepreneurship,
              academia, technology, healthcare, and many other fields. AAA provides a common platform
              through which Ajeets can reconnect, collaborate, support one another, and contribute to
              the larger Ajeet fraternity.
            </p>
            <p>
              Beyond alumni networking, AAA is committed to supporting the welfare and growth of
              Ajeets, their families, and our alma mater.
            </p>
            <p className="font-display text-base font-semibold italic text-brand-800">{AAA_MOTTO}</p>
          </div>

          <Section title="Why We Exist">
            <p>The bonds formed at Sainik School Bijapur extend far beyond school years.</p>
            <p>
              The purpose of AAA is to ensure that Ajeets remain connected to one another and to our
              alma mater throughout their lives.
            </p>
            <p>
              By bringing together alumni from different batches, professions, and geographies, the
              Association seeks to create a community where members can reconnect, support one
              another, share knowledge, and contribute to the growth of future generations of Ajeets.
            </p>
          </Section>

          <Section title="Our Mission">
            <p>
              To build a strong, inclusive, and engaged alumni community that supports fellow
              Ajeets, strengthens ties with Sainik School Bijapur, and creates opportunities for
              lifelong connection, learning, mentorship, and service.
            </p>
          </Section>

          <Section title="Our Values">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Integrity</h3>
                <p>We uphold honesty, accountability, and ethical conduct in everything we do.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Respect</h3>
                <p>
                  We value every member of the Ajeet fraternity and encourage meaningful engagement
                  across generations.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Service</h3>
                <p>
                  We embrace the spirit of service before self and strive to contribute positively to
                  our community and society.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Inclusiveness</h3>
                <p>
                  We welcome participation from Ajeets across all batches, professions, and
                  geographies.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Brotherhood</h3>
                <p>We celebrate the shared experiences that unite Ajeets throughout life.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Stewardship</h3>
                <p>
                  We are committed to preserving and strengthening the legacy of the Ajeet community
                  for future generations.
                </p>
              </div>
            </div>
          </Section>

          <Section title="About This Platform">
            <p>
              The Ajeet Alumni Platform has been created to serve as the digital home of the Ajeet
              community.
            </p>
            <p>The platform enables alumni to:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Claim and maintain their profiles</li>
              <li>Reconnect with batchmates and fellow Ajeets</li>
              <li>Search the alumni directory</li>
              <li>Discover alumni across professions and locations</li>
              <li>Stay informed about Association initiatives</li>
              <li>Participate in future community activities</li>
            </ul>
            <p>
              The platform is managed under the stewardship of the Ajeet Alumni Association and will
              continue to evolve to better serve the needs of the community.
            </p>
          </Section>

          <Section title="Looking Ahead">
            <p>
              The Ajeet fraternity has always been built on camaraderie, trust, and mutual support.
            </p>
            <p>As the community grows, AAA aims to create more opportunities for alumni engagement through:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Mentorship and knowledge sharing</li>
              <li>Professional networking</li>
              <li>Regional and international chapters</li>
              <li>Alumni events and reunions</li>
              <li>Community initiatives and service activities</li>
              <li>Stories and experiences from fellow Ajeets</li>
              <li>Podcasts and digital content</li>
              <li>Career and business connections</li>
            </ul>
            <p>
              Together, we aim to preserve the spirit of the Ajeet brotherhood while building a
              stronger future for generations to come.
            </p>
          </Section>

          <div className="mt-10 rounded-xl border border-gold-200/80 bg-warm-white px-5 py-6 text-center sm:px-8">
            <h2 className="font-display text-lg font-semibold text-brand-900">Join the Ajeet Network</h2>
            <p className="mt-2 text-sm text-slate-600">
              Reconnect with your batchmates, discover fellow alumni, and help strengthen the Ajeet
              community for future generations.
            </p>
            <Link to="/claim" className="mt-4 inline-block">
              <Button variant="accent">Claim Your Profile</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
