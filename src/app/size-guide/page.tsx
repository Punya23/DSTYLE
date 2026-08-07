import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { FIT_NOTES, HOW_TO_MEASURE, SIZE_ROWS, toCm } from "@/data/sizing";
import { COMPANY } from "@/lib/company";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Size Guide",
  description:
    "Dstyle house sizing in inches and centimetres, how to measure yourself accurately, and how each silhouette is cut to fit.",
  path: "/size-guide",
});

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen bg-brand-ivory pt-[72px]">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Size Guide", path: "/size-guide" },
        ])}
      />

      <div className="mx-auto max-w-[820px] px-6 py-14 lg:px-12 lg:py-20">
        <header>
          <p className="eyebrow text-brand-gold">House sizing</p>
          <h1 className="display-2 mt-3 text-brand-ink">Find your size</h1>
          <p className="body-copy mt-4 max-w-[58ch]">
            Every figure below is a body measurement taken over undergarments —
            not a garment measurement. Ease is cut into each piece differently,
            so the finished garment always measures larger than the table.
          </p>
          <span className="mt-8 block h-px w-16 gold-rule-solid opacity-60" />
        </header>

        <section className="mt-12">
          <h2 className="font-display text-2xl not-italic text-brand-ink lg:text-[1.75rem]">
            The chart
          </h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">
                Body measurements for each house size, in inches and centimetres
              </caption>
              <thead>
                <tr className="border-b border-brand-ink/15">
                  <th scope="col" className="micro-label pb-3 text-brand-grey-dark">
                    Size
                  </th>
                  {["Bust", "Waist", "Hip"].map((head) => (
                    <th
                      key={head}
                      scope="col"
                      colSpan={2}
                      className="micro-label pb-3 text-brand-grey-dark"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-brand-ink/10">
                  <th scope="col" className="sr-only">
                    Size
                  </th>
                  {["Bust", "Waist", "Hip"].flatMap((head) => [
                    <th
                      key={`${head}-in`}
                      scope="col"
                      className="pb-2 font-sans text-[10px] font-normal tracking-[0.14em] uppercase text-brand-grey-dark"
                    >
                      in
                    </th>,
                    <th
                      key={`${head}-cm`}
                      scope="col"
                      className="pb-2 font-sans text-[10px] font-normal tracking-[0.14em] uppercase text-brand-grey-dark"
                    >
                      cm
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {SIZE_ROWS.map((row) => (
                  <tr key={row.size} className="border-b border-brand-ink/10">
                    <th
                      scope="row"
                      className="py-3.5 text-left font-sans text-[13px] font-medium text-brand-ink"
                    >
                      {row.size}
                    </th>
                    {[row.bust, row.waist, row.hip].flatMap((value, i) => [
                      <td
                        key={`${row.size}-${i}-in`}
                        className="py-3.5 font-sans text-[13px] tabular-nums text-brand-ink-soft"
                      >
                        {value}
                        &Prime;
                      </td>,
                      <td
                        key={`${row.size}-${i}-cm`}
                        className="py-3.5 font-sans text-[13px] tabular-nums text-brand-grey-dark"
                      >
                        {toCm(value)}
                      </td>,
                    ])}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl not-italic text-brand-ink lg:text-[1.75rem]">
            How to measure
          </h2>
          <p className="body-copy mt-4 max-w-[58ch]">
            Use a soft tape, stand relaxed, and have someone else take the
            measurement if you can — measuring yourself pulls the tape tight
            without your noticing, and a tight tape is how a piece ends up a
            size too small.
          </p>
          <dl className="mt-6 grid grid-cols-[minmax(64px,auto)_1fr] gap-x-8 gap-y-4">
            {HOW_TO_MEASURE.map(([term, detail]) => (
              <div key={term} className="contents">
                <dt className="font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-brand-grey-dark">
                  {term}
                </dt>
                <dd className="font-sans text-[13px] leading-[1.8] text-brand-ink-soft">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl not-italic text-brand-ink lg:text-[1.75rem]">
            How each silhouette is cut
          </h2>
          <div className="mt-5 border-t border-brand-ink/10">
            {FIT_NOTES.map((fit) => (
              <div
                key={fit.silhouette}
                className="grid gap-2 border-b border-brand-ink/10 py-5 sm:grid-cols-[160px_1fr] sm:gap-8"
              >
                <h3 className="font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-brand-gold">
                  {fit.silhouette}
                </h3>
                <p className="body-copy">{fit.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border border-brand-line bg-brand-paper px-6 py-8 sm:px-10">
          <h2 className="font-display text-2xl not-italic text-brand-ink">
            Cut to your measurements
          </h2>
          <p className="body-copy mt-3 max-w-[54ch]">
            Most pieces can be made to measure. Send your bust, waist and hip
            measurements with the piece you have in mind and we will confirm the
            price and the timeline before taking anything.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href="/contact" className="btn-primary">
              Ask the atelier
            </Link>
            <a
              href={`mailto:${COMPANY.supportEmail}`}
              className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
            >
              {COMPANY.supportEmail}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
