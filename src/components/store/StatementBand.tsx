import { TextHoverEffect } from "@/components/ui/aceternity/text-hover-effect";

/**
 * Full-width dark statement band. The wordmark is outlined; moving the cursor
 * across it reveals a gold gradient (Aceternity text-hover-effect, re-themed).
 *
 * Three words and the wordmark — nothing else. The closing sentence this band
 * used to carry ("worn for the moments that become memory") was the hero
 * tagline and the brand-story paragraph said a third time.
 */
export function StatementBand() {
  return (
    <section className="relative bg-brand-ink overflow-hidden pb-16 lg:pb-24">
      <div className="shell pt-16 lg:pt-20 text-center">
        <p className="eyebrow eyebrow-light">Handcrafted in Mumbai</p>
      </div>
      <div className="h-[34vh] min-h-[240px] md:h-[42vh] w-full">
        <TextHoverEffect text="DSTYLE" duration={0.25} />
      </div>
    </section>
  );
}
