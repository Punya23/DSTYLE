"use client";

import { SectionHeading } from "./Section";
import { ExpandableCards, type ExpandableCardItem } from "@/components/ui/aceternity/expandable-card";

const STORIES: ExpandableCardItem[] = [
  {
    label: "Journal · Bridal",
    title: "The Bridal Diaries",
    description: "Choosing the lehenga you'll remember forever.",
    image: "/editorial/05.jpg",
    ctaText: "Discover Bridal",
    ctaLink: "/collections?collection=bridal",
    content: (
      <>
        <p>
          A bridal lehenga is rarely the first one you try. It&rsquo;s the one that quiets the room
          — where the weight of the ghagra, the fall of the dupatta, and the colour against your
          skin all agree at once.
        </p>
        <p>
          Begin early. Book an atelier fitting six months out, bring the people whose eyes you
          trust, and let the piece be adjusted to you rather than the other way around.
        </p>
      </>
    ),
  },
  {
    label: "Journal · Craft",
    title: "Inside the Atelier",
    description: "A day among the karigars of Mumbai.",
    image: "/editorial/01.jpg",
    ctaText: "Our Story",
    ctaLink: "/about",
    content: (
      <>
        <p>
          Mornings begin with the stretch of fabric onto wooden frames. By noon the room is a low
          hum of needles — zardozi, aari, and hand-knotting worked in unison, each karigar carrying
          a motif they&rsquo;ve made their own over decades.
        </p>
        <p>
          A single festive panel can pass through six pairs of hands before it&rsquo;s finished.
          That patience is the house&rsquo;s real signature.
        </p>
      </>
    ),
  },
  {
    label: "Journal · Styling",
    title: "The Art of Drape",
    description: "Six yards, styled a dozen ways.",
    image: "/editorial/03.jpg",
    ctaText: "Explore Collections",
    ctaLink: "/collections",
    content: (
      <>
        <p>
          The sari is the most generous garment we make — the same six yards can read classic,
          modern, or entirely your own depending on the drape. A belted pallu for the reception, a
          loose seedha for a puja, a cape over a gown for the evening.
        </p>
        <p>
          Our stylists will show you three ways to wear a piece before you leave the atelier, so it
          earns its place many times over.
        </p>
      </>
    ),
  },
];

export function JournalSection() {
  return (
    <section className="section-y bg-brand-ivory">
      <div className="shell">
        <SectionHeading
          align="center"
          eyebrow="The Journal"
          title="Notes from the House"
          className="mb-12 lg:mb-16"
        />

        <div className="max-w-5xl mx-auto">
          <ExpandableCards cards={STORIES} />
        </div>

        <p className="mt-10 text-center text-[10px] font-sans tracking-luxe uppercase text-brand-ink/40">
          Tap a story to read
        </p>
      </div>
    </section>
  );
}
