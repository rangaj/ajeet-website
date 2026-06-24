import type { PolicyDocument, PolicySection } from "@/content/policies";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";

function PolicyBlock({ block }: { block: PolicySection }) {
  if (block.type === "paragraph") {
    return <p className="text-sm leading-relaxed text-slate-700 sm:text-base">{block.text}</p>;
  }

  if (block.type === "subheading") {
    return <h3 className="mt-4 font-semibold text-slate-900">{block.text}</h3>;
  }

  if (block.type === "email") {
    return (
      <a
        href={block.href}
        className="text-sm font-medium text-brand-600 hover:text-brand-700 sm:text-base"
      >
        {block.text}
      </a>
    );
  }

  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 sm:text-base">
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PolicyDocumentView({ document }: { document: PolicyDocument }) {
  return (
    <div className="mx-auto max-w-2xl pb-10">
      <PageHeader title={document.title} />
      <Card className="space-y-8 p-5 sm:p-8">
        <p className="text-sm text-slate-500">Last updated: {document.lastUpdated}</p>

        <div className="space-y-4">
          {document.intro.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-slate-700 sm:text-base">
              {paragraph}
            </p>
          ))}
        </div>

        {document.sections.map((section) => (
          <section key={section.heading} className="space-y-3 border-t border-surface-border pt-6">
            <h2 className="font-display text-lg font-semibold text-brand-900">{section.heading}</h2>
            <div className="space-y-3">
              {section.blocks.map((block, index) => (
                <PolicyBlock key={`${section.heading}-${index}`} block={block} />
              ))}
            </div>
          </section>
        ))}
      </Card>
    </div>
  );
}
