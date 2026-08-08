import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { POLICIES, POLICY_SLUGS, getPolicy } from "@/data/policies";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/structured-data";

/** Policy copy is compiled in, so every page can be fully static. */
export const dynamicParams = false;

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return pageMetadata({ title: "Not found", description: "", path: "/policies" });

  return pageMetadata({
    title: policy.title,
    description: policy.summary,
    path: `/policies/${policy.slug}`,
  });
}

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  const others = POLICIES.filter((p) => p.slug !== policy.slug);

  return (
    <div className="min-h-screen bg-brand-ivory pt-[72px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: policy.title, path: `/policies/${policy.slug}` },
        ])}
      />

      <div className="mx-auto max-w-[760px] px-6 py-14 lg:px-12 lg:py-20">
        <header>
          <p className="eyebrow text-brand-gold">{policy.eyebrow}</p>
          <h1 className="display-2 mt-3 text-brand-ink">{policy.title}</h1>
          <p className="body-copy mt-4 max-w-[58ch]">{policy.summary}</p>
          <p className="micro-label mt-6 text-brand-grey-dark">
            Last updated {dateFormat.format(new Date(policy.updated))}
          </p>
          <span className="mt-8 block h-px w-16 gold-rule-solid opacity-60" />
        </header>

        {/* Anchored contents — these documents are long and people arrive
            looking for one specific clause. */}
        <nav aria-label="On this page" className="mt-10 border-l border-brand-ink/10 pl-5">
          <ul className="space-y-2">
            {policy.sections.map((section) => (
              <li key={section.heading}>
                <a
                  href={`#${sectionId(section.heading)}`}
                  className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-12 space-y-12">
          {policy.sections.map((section) => (
            <section key={section.heading} id={sectionId(section.heading)} className="scroll-mt-28">
              <h2 className="font-display text-2xl not-italic text-brand-ink lg:text-[1.75rem]">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="body-copy">
                    {paragraph}
                  </p>
                ))}
                {section.points && (
                  <ul className="space-y-3">
                    {section.points.map((point) => (
                      <li key={point} className="body-copy flex gap-3">
                        <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-brand-gold" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 border-t border-brand-ink/10 pt-8">
          <p className="micro-label text-brand-grey-dark">More policies</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/policies/${other.slug}`}
                  className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
                >
                  {other.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/contact"
                className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
              >
                Contact us
              </Link>
            </li>
          </ul>
        </footer>
      </div>
    </div>
  );
}

/** Stable anchor from a heading — headings are authored, so this is enough. */
function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
