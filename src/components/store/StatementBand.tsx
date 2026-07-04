import { TextHoverEffect } from "@/components/ui/aceternity/text-hover-effect";

/**
 * Full-width dark statement band. The wordmark is outlined; moving the cursor
 * across it reveals a gold gradient (Aceternity text-hover-effect, re-themed).
 */
export function StatementBand() {
  return (
    <section className="relative bg-brand-ink overflow-hidden">
      <div className="shell pt-16 lg:pt-20 text-center">
        <p className="eyebrow eyebrow-light">Handcrafted in Mumbai</p>
      </div>
      <div className="h-[34vh] min-h-[240px] md:h-[42vh] w-full">
        <TextHoverEffect text="DSTYLE" duration={0.25} />
      </div>
      <div className="shell pb-16 lg:pb-24 text-center">
        <p className="mx-auto max-w-md text-[14px] leading-relaxed text-white/45 text-pretty">
          Couture born of a reverence for craft — worn for the moments that become memory.
        </p>
      </div>
    </section>
  );
}
