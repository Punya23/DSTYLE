import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND_STORY_IMAGE } from "@/data/demo-assets";
import { Reveal } from "./Section";

export function BrandStory() {
  return (
    <section className="section-y bg-brand-white overflow-hidden">
      <div className="shell grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 lg:gap-24 items-center">
        <Reveal>
          <span className="eyebrow">The House</span>
          <h2 className="display-2 text-brand-ink mt-4 mb-7 text-balance">
            Crafted with intention, worn with grace.
          </h2>
          {/* One sentence. The full version of this story lives on /about —
              the homepage only has to make someone want to read it. */}
          <p className="max-w-[440px] text-[15px] leading-relaxed text-brand-ink-soft text-pretty">
            Founded by designer Dipti Shah — hand-embroidered, hand-dyed, made for women
            who carry their heritage lightly.
          </p>
          <div className="mt-9">
            <Link href="/about">
              <Button variant="outline" size="md">
                Our Story
              </Button>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="relative aspect-[4/5] w-full md:ml-auto max-w-[560px] overflow-hidden">
          <Image
            src={BRAND_STORY_IMAGE}
            alt="Inside the Dstyle atelier"
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 45vw"
          />
        </Reveal>
      </div>
    </section>
  );
}
