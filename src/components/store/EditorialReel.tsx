import Image from "next/image";
import { EDITORIAL_ITEMS } from "@/data/demo-assets";
import { Reveal, SectionHeading } from "./Section";

export function EditorialReel() {
  return (
    <section className="section-y bg-brand-ink overflow-hidden">
      <div className="shell mb-10 lg:mb-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <SectionHeading light eyebrow="Visual Stories" title="The Editorial" />
          <Reveal delay={0.1}>
            <p className="text-[13px] leading-relaxed text-white/40 max-w-[300px] text-pretty">
              Campaign shoots, events, and atelier moments from the House of Dstyle.
            </p>
          </Reveal>
        </div>
      </div>

      <div
        className="flex gap-3 md:gap-4 lg:gap-5 overflow-x-auto hide-scrollbar snap-x snap-mandatory"
        style={{ paddingInline: "clamp(1.25rem, 5vw, 5rem)" }}
      >
        {EDITORIAL_ITEMS.map((item) => (
          <div
            key={item.id}
            className="relative shrink-0 w-[80vw] sm:w-[52vw] md:w-[40vw] lg:w-[30vw] xl:w-[23vw] snap-start group"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-white/[0.04]">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover object-top opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-[1.04]"
                sizes="(max-width: 768px) 80vw, 24vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/85 via-brand-ink/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="eyebrow eyebrow-light mb-2 opacity-90">{item.subtitle}</p>
                <h3 className="font-display italic text-2xl text-white">{item.title}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
