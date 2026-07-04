"use client";

import { SectionHeading } from "./Section";
import { ExpandableCards, type ExpandableCardItem } from "@/components/ui/aceternity/expandable-card";

const CRAFT: ExpandableCardItem[] = [
  {
    label: "01 — The Needle",
    title: "Hand Embroidery",
    description: "Zardozi, aari & tassel work, placed by hand.",
    image: "/products/ivory-zardozi-saree/01.jpg",
    ctaText: "Book an Appointment",
    ctaLink: "/about",
    content: (
      <>
        <p>
          Every motif begins as a pencil tracing on tissue, then travels to the karigar&rsquo;s
          frame. Zardozi threads of real metal, aari hooks, and hand-knotted tassels are worked
          across weeks — a single bridal panel can hold months of quiet hours.
        </p>
        <p>
          Nothing is machine-finished. The slight irregularity of a hand-laid sequin is the
          signature of a piece made by people, not presses.
        </p>
      </>
    ),
  },
  {
    label: "02 — The Cloth",
    title: "Precious Fabrics",
    description: "Pure silks, organza & georgette, chosen for drape.",
    image: "/editorial/04.jpg",
    ctaText: "Explore Collections",
    ctaLink: "/collections",
    content: (
      <>
        <p>
          We source pure mulberry silk, feather-light organza, and fluid georgette for the way
          they catch light and fall against the body. Each bolt is chosen for drape, luminosity,
          and longevity — cloth meant to be kept and passed on.
        </p>
        <p>
          Colour is developed in-house, dyed in small lots so every hue sits exactly where the
          designer intended.
        </p>
      </>
    ),
  },
  {
    label: "03 — The Fit",
    title: "Made to Order",
    description: "Custom sizing, colourways & bespoke finishing.",
    image: "/editorial/06.jpg",
    ctaText: "Book an Appointment",
    ctaLink: "/about",
    content: (
      <>
        <p>
          Couture is personal. Bridal and made-to-order clients are fitted in the atelier, where
          silhouette, sizing, and colourway are shaped to one wearer alone. Sleeves, necklines,
          and finishing are adjusted by hand through successive trials.
        </p>
        <p>
          Allow six to twelve weeks for a bespoke commission — the time a piece of this order
          deserves.
        </p>
      </>
    ),
  },
];

export function AtelierSection() {
  return (
    <section className="section-y bg-brand-white">
      <div className="shell">
        <SectionHeading
          align="center"
          eyebrow="The Atelier"
          title="Where craft becomes couture"
          className="mb-12 lg:mb-14"
        />
        <span className="mx-auto mb-12 lg:mb-16 block h-px w-16 gold-rule" />

        <div className="max-w-5xl mx-auto">
          <ExpandableCards cards={CRAFT} />
        </div>

        <p className="mt-10 text-center text-[10px] font-sans tracking-luxe uppercase text-brand-ink/40">
          Tap a craft to explore
        </p>
      </div>
    </section>
  );
}
