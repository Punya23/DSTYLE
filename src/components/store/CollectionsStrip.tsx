import Image from "next/image";
import Link from "next/link";
import { COLLECTION_BANNERS } from "@/data/demo-assets";
import { MediaPlaceholder } from "./MediaPlaceholder";
import { Reveal, SectionHeading } from "./Section";
import { CardContainer, CardBody, CardItem } from "@/components/ui/aceternity/3d-card";

const COLLECTIONS = [
  { id: "1", name: "Bridal", slug: "bridal", description: "For the forever moment" },
  { id: "2", name: "Festive", slug: "festive", description: "Celebrate in colour" },
  { id: "3", name: "Cocktail", slug: "cocktail", description: "Evening glamour" },
  { id: "4", name: "Pret", slug: "pret", description: "Everyday luxury" },
];

export function CollectionsStrip() {
  return (
    <section className="section-y bg-brand-ivory">
      <div className="shell">
        <SectionHeading
          align="center"
          eyebrow="Curated Worlds"
          title="Explore the Collections"
          className="mb-12 lg:mb-16"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4 lg:gap-5">
          {COLLECTIONS.map((collection, i) => {
            const banner = COLLECTION_BANNERS[collection.slug];
            return (
              <Reveal key={collection.id} delay={i * 0.08}>
                <CardContainer containerClassName="py-0" className="w-full">
                  <CardBody className="group relative w-full h-auto aspect-[3/4]">
                    <CardItem translateZ={30} className="absolute inset-0 w-full h-full">
                      <Link
                        href={`/collections?collection=${collection.slug}`}
                        className="relative block w-full h-full overflow-hidden bg-brand-ivory-deep rounded-[4px] transition-transform duration-150 active:scale-[0.98]"
                      >
                        {banner ? (
                          <Image
                            src={banner}
                            alt={collection.name}
                            fill
                            className="object-cover object-top transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        ) : (
                          <MediaPlaceholder index={i} className="w-full h-full" />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-brand-ink/70 via-brand-ink/10 to-transparent" />
                      </Link>
                    </CardItem>

                    <CardItem
                      translateZ={65}
                      className="absolute bottom-0 left-0 right-0 p-5 lg:p-7 pointer-events-none"
                    >
                      <h3 className="font-display text-2xl lg:text-[1.9rem] text-white leading-none">
                        {collection.name}
                      </h3>
                      <p className="eyebrow eyebrow-light mt-2.5 opacity-80">
                        {collection.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-sans tracking-luxe uppercase text-brand-champagne opacity-90 transition-opacity duration-500 group-hover:opacity-100">
                        Explore
                        <span className="h-px w-6 bg-brand-champagne" />
                      </span>
                    </CardItem>
                  </CardBody>
                </CardContainer>
              </Reveal>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/collections"
            className="link-reveal text-[11px] font-sans font-medium tracking-luxe uppercase text-brand-ink"
          >
            View All Collections
          </Link>
        </div>
      </div>
    </section>
  );
}
