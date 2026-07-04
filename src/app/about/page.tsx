import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImagesSlider } from "@/components/ui/aceternity/images-slider";
import { ABOUT_HERO_IMAGES } from "@/data/demo-assets";

export const metadata: Metadata = {
  title: "About",
  description: "The story of Dstyle — Indian couture by designer Dipti Shah.",
};

export default function AboutPage() {
  return (
    <div className="pt-[72px]">
      {/* Hero */}
      <div className="relative h-[55vh] min-h-[420px] overflow-hidden bg-brand-ink">
        <ImagesSlider
          images={ABOUT_HERO_IMAGES}
          priority
          direction="up"
          className="h-full w-full"
          overlayClassName="media-scrim"
        >
          <div className="absolute inset-x-0 bottom-0 px-6 lg:px-12 pb-14">
            <p className="text-[11px] font-sans tracking-luxe uppercase text-brand-champagne mb-4">
              Est. Mumbai, India
            </p>
            <h1 className="font-display italic text-5xl lg:text-7xl text-white leading-tight text-balance">
              The House of Dstyle
            </h1>
          </div>
        </ImagesSlider>
      </div>

      {/* Story */}
      <div className="px-6 lg:px-12 py-20 lg:py-28 bg-brand-ivory">
        <div className="max-w-[700px] mx-auto space-y-8">
          <p className="font-display italic text-3xl lg:text-4xl text-black leading-snug text-balance">
            &ldquo;Fashion is not just what you wear — it is how you carry your
            story.&rdquo;
          </p>
          <span className="block h-px w-16 gold-rule-solid opacity-60" />
          <p className="font-sans text-[14px] text-[#666] leading-relaxed">
            Dstyle was born from a simple belief: that Indian women deserve
            fashion that honours their heritage while celebrating who they are
            today. Founded by designer Dipti Shah, every Dstyle piece is a
            meditation on craft — hand-embroidered threads, hand-dyed fabrics,
            and silhouettes shaped by hours of dedication.
          </p>
          <p className="font-sans text-[14px] text-[#666] leading-relaxed">
            From our bridal couture to our everyday pret, we design for women
            who move between worlds — who can wear a lehenga to a wedding and
            own the room, and who carry the same confidence in a simple kurta
            at a Sunday market.
          </p>
          <p className="font-sans text-[14px] text-[#666] leading-relaxed">
            Our atelier is based in Mumbai. Every collection is produced in
            small quantities, because we believe that true luxury means
            something made thoughtfully, not in millions.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="px-6 lg:px-12 py-16 lg:py-24 bg-white border-y border-brand-ivory-deep">
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-12">
          {[
            {
              number: "01",
              title: "Craft",
              body: "Each piece is hand-finished by artisans trained for years in traditional Indian embroidery and weaving.",
            },
            {
              number: "02",
              title: "Sustainability",
              body: "We produce in small batches, use natural dyes wherever possible, and avoid fast fashion timelines.",
            },
            {
              number: "03",
              title: "Inclusivity",
              body: "Our size range runs XS to XXL. Every collection is designed on diverse body types from sketch to final fitting.",
            },
          ].map((v) => (
            <div key={v.title}>
              <span className="font-display italic text-4xl text-gold-gradient leading-none">
                {v.number}
              </span>
              <h3 className="font-display italic text-2xl text-black mt-3 mb-3">
                {v.title}
              </h3>
              <p className="font-sans text-[13px] text-[#666] leading-relaxed">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 lg:px-12 py-20 lg:py-28 text-center bg-brand-ivory">
        <p className="text-[11px] font-sans tracking-luxe uppercase text-brand-gold mb-3">
          The Collections
        </p>
        <h2 className="font-display italic text-4xl lg:text-5xl text-black mb-8">
          Ready to explore?
        </h2>
        <Link href="/collections">
          <Button size="lg">Browse Collections</Button>
        </Link>
      </div>
    </div>
  );
}
