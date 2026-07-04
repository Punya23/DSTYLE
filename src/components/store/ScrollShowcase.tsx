"use client";

import Image from "next/image";
import Link from "next/link";
import { ContainerScroll } from "@/components/ui/aceternity/container-scroll-animation";

/**
 * A campaign image, pinned while it tilts up from a deep recline to flat over a
 * long, slow scroll (Aceternity container-scroll, re-themed). The section must
 * NOT clip overflow — that would break the sticky pin inside.
 */
export function ScrollShowcase() {
  return (
    <section className="bg-brand-ivory">
      <ContainerScroll
        titleComponent={
          <div className="pb-2">
            <p className="eyebrow mb-3">The Bridal Edit</p>
            <h2 className="display-2 text-brand-ink text-balance">
              Made for the moment you&rsquo;ll never forget
            </h2>
            <Link
              href="/collections?collection=bridal"
              className="link-reveal mt-6 inline-block text-[11px] font-sans font-medium tracking-luxe uppercase text-brand-gold"
            >
              Discover Bridal
            </Link>
          </div>
        }
      >
        <Image
          src="/editorial/06.jpg"
          alt="Dstyle bridal campaign"
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 100vw, 1024px"
        />
      </ContainerScroll>
    </section>
  );
}
