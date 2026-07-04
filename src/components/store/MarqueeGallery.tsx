"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "./Section";
import { LOOKBOOK_IMAGES, EDITORIAL_ITEMS } from "@/data/demo-assets";

// Code-split the marquee (framer, no SSR) so it never weighs down first load.
const ThreeDMarquee = dynamic(
  () => import("@/components/ui/aceternity/3d-marquee").then((m) => m.ThreeDMarquee),
  { ssr: false, loading: () => <div className="h-[600px] max-sm:h-100" /> }
);

const BASE = [...LOOKBOOK_IMAGES.map((l) => l.image), ...EDITORIAL_ITEMS.map((e) => e.image)];
// The marquee splits its images into 4 diagonal columns — repeat the catalogue
// up to 40 so every column is long enough to fill the frame (no empty corner).
const IMAGES = Array.from({ length: 40 }, (_, i) => BASE[i % BASE.length]);

export function MarqueeGallery() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The infinite column animation only exists while the section is near the
    // viewport — it unmounts when scrolled away, so it never idles in the bg.
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "300px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="section-y bg-brand-ink overflow-hidden">
      <div className="shell mb-10 lg:mb-14">
        <SectionHeading light align="center" eyebrow="@dipti__shahh" title="The Gallery" />
      </div>
      <div ref={ref}>
        {inView ? (
          <ThreeDMarquee images={IMAGES} />
        ) : (
          <div className="h-[600px] max-sm:h-100" />
        )}
      </div>
    </section>
  );
}
