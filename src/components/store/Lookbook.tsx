import Image from "next/image";
import Link from "next/link";
import { LOOKBOOK_IMAGES } from "@/data/demo-assets";
import { Reveal, SectionHeading } from "./Section";

export function Lookbook() {
  return (
    <section className="section-y bg-brand-ivory">
      <div className="shell">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10 lg:mb-14">
          <SectionHeading eyebrow="@dipti__shahh" title="Seen & Styled" />
          <Reveal delay={0.1}>
            <a
              href="https://instagram.com/dipti__shahh"
              target="_blank"
              rel="noopener noreferrer"
              className="link-reveal text-[11px] font-sans font-medium tracking-luxe uppercase text-brand-ink whitespace-nowrap"
            >
              Follow on Instagram
            </a>
          </Reveal>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-2.5 lg:gap-3">
          {LOOKBOOK_IMAGES.map((look, i) => (
            <Reveal key={look.id} delay={(i % 6) * 0.05}>
              <Link
                href={`/products/${look.productSlug}`}
                className="group relative block aspect-square overflow-hidden bg-brand-ivory-deep"
              >
                <Image
                  src={look.image}
                  alt={look.productName}
                  fill
                  className="object-cover object-top transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.08]"
                  sizes="(max-width: 768px) 33vw, 16vw"
                />
                <div className="absolute inset-0 bg-brand-ink/0 group-hover:bg-brand-ink/45 transition-colors duration-500 flex items-center justify-center">
                  <span className="text-[9px] font-sans tracking-luxe uppercase text-brand-champagne opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                    Shop Look
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
