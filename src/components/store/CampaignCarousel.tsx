import Carousel from "@/components/ui/aceternity/carousel";
import { EDITORIAL_ITEMS } from "@/data/demo-assets";
import { SectionHeading } from "./Section";

const SLIDES = EDITORIAL_ITEMS.map((item) => ({
  title: item.title,
  button: "View the Story",
  src: item.image,
}));

/**
 * Campaign carousel — replaces the flat editorial reel with the Aceternity
 * 3D carousel (re-themed to the couture palette).
 */
export function CampaignCarousel() {
  return (
    <section className="section-y bg-brand-ink overflow-hidden">
      <div className="shell mb-14 lg:mb-20">
        <SectionHeading light align="center" eyebrow="Visual Stories" title="The Campaigns" />
      </div>
      <Carousel slides={SLIDES} />
    </section>
  );
}
