import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MediaPlaceholder } from "./MediaPlaceholder";
import { Reveal } from "./Section";
import { SectionHeader } from "./SectionHeader";

export interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  /** One-line editorial descriptor under the name. */
  tagline?: string | null;
  /** Collection banner. Falls back to a tonal placeholder when absent. */
  image?: string | null;
}

export interface CategoryTilesProps {
  tiles: CategoryTile[];
  eyebrow?: string;
  /** Omit to render the row with no header at all. */
  title?: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  /** Eager-load the tile images — only worth it if the row is above the fold. */
  priority?: boolean;
  className?: string;
}

/**
 * The entry point into the taxonomy: one image tile per collection, 2-up on
 * mobile and 4-up from lg. This is the shopper's first fork in the road, so it
 * sits directly under the hero and every tile is a single link target — the
 * "Explore" cue is a span, not a nested anchor.
 */
export function CategoryTiles({
  tiles,
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel,
  priority = false,
  className,
}: CategoryTilesProps) {
  if (tiles.length === 0) return null;

  return (
    <section className={cn("section-rhythm", className)}>
      {title && (
        <Reveal className="shell">
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            href={href}
            linkLabel={linkLabel}
          />
        </Reveal>
      )}

      <Reveal delay={title ? 0.08 : 0}>
        <ul
          className={cn(
            "shell grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4",
            title && "mt-9"
          )}
        >
          {tiles.map((tile, i) => (
            <li key={tile.id}>
              <Link href={`/collections/${tile.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-brand-ivory-deep">
                  {tile.image ? (
                    <Image
                      src={tile.image}
                      alt={tile.name}
                      fill
                      priority={priority && i < 4}
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-top transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <MediaPlaceholder index={i} className="h-full w-full" />
                  )}

                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/75 via-brand-ink/15 to-transparent" />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 lg:p-6">
                    <h3 className="font-display not-italic text-[1.35rem] leading-none text-white lg:text-[1.65rem]">
                      {tile.name}
                    </h3>
                    {/* line-clamp-2 because this is fed from
                        `Collection.description`, which is long-form marketing
                        copy — unclamped it spills over the artwork and swamps
                        the tile on mobile. */}
                    {tile.tagline && (
                      <p className="mt-2 line-clamp-2 font-sans text-[11px] leading-snug text-white/65">
                        {tile.tagline}
                      </p>
                    )}
                    <span className="micro-label mt-4 inline-block border-b border-white/30 pb-1 text-brand-champagne transition-colors duration-300 group-hover:border-brand-champagne">
                      Explore
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
