import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ALL_FAQS, FAQ_GROUPS } from "@/data/faqs";
import { COMPANY } from "@/lib/company";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Answers on Dstyle orders, shipping, returns, sizing, craft and payments — and how to reach a human when the answer isn't here.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-brand-ivory pt-[72px]">
      <JsonLd
        data={[
          faqSchema(ALL_FAQS, "/faq"),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "FAQs", path: "/faq" },
          ]),
        ]}
      />

      <div className="mx-auto max-w-[820px] px-6 py-14 lg:px-12 lg:py-20">
        <header>
          <p className="eyebrow text-brand-gold">Customer care</p>
          <h1 className="display-2 mt-3 text-brand-ink">Frequently asked</h1>
          <p className="body-copy mt-4 max-w-[58ch]">
            The questions we are asked most, answered plainly. If yours is not
            here, we would rather you asked than guessed.
          </p>
          <span className="mt-8 block h-px w-16 gold-rule-solid opacity-60" />
        </header>

        <nav aria-label="FAQ sections" className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.title}
              href={`#${groupId(group.title)}`}
              className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
            >
              {group.title}
            </a>
          ))}
        </nav>

        <div className="mt-14 space-y-14">
          {FAQ_GROUPS.map((group) => (
            <section key={group.title} id={groupId(group.title)} className="scroll-mt-28">
              <h2 className="font-display text-2xl not-italic text-brand-ink lg:text-[1.75rem]">
                {group.title}
              </h2>
              <div className="mt-5 border-t border-brand-ink/10">
                {group.items.map((faq) => (
                  // `<details>` keeps this readable with JavaScript disabled and
                  // gives keyboard users the disclosure behaviour for free.
                  <details
                    key={faq.question}
                    className="group border-b border-brand-ink/10 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 font-sans text-[14px] leading-relaxed text-brand-ink transition-colors duration-300 hover:text-brand-gold">
                      {faq.question}
                      <span
                        aria-hidden
                        className="relative mt-2 h-3 w-3 shrink-0 text-brand-gold"
                      >
                        <span className="absolute top-1/2 left-0 h-px w-3 -translate-y-1/2 bg-current" />
                        <span className="absolute top-0 left-1/2 h-3 w-px -translate-x-1/2 bg-current transition-transform duration-300 group-open:scale-y-0" />
                      </span>
                    </summary>
                    <p className="body-copy max-w-[62ch] pr-9 pb-6">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16 border border-brand-line bg-brand-paper px-6 py-8 sm:px-10">
          <h2 className="font-display text-2xl not-italic text-brand-ink">
            Still need a person?
          </h2>
          <p className="body-copy mt-3 max-w-[54ch]">
            We answer {COMPANY.responseWindow}, {COMPANY.supportHours.toLowerCase()}.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href="/contact" className="btn-primary">
              Contact us
            </Link>
            <a
              href={`mailto:${COMPANY.supportEmail}`}
              className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
            >
              {COMPANY.supportEmail}
            </a>
            <a
              href={`tel:${COMPANY.phone}`}
              className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
            >
              {COMPANY.phoneDisplay}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function groupId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
