"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MagneticButton } from "@/components/ui/aceternity/magnetic-button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

export interface HeroSlide {
  src: string;
  alt: string;
  /** CSS object-position — every source photo is a portrait studio shot, so
   * this is what keeps the subject framed instead of floor-length fabric
   * once a wide viewport crops the image down. */
  focalPoint?: string;
}

interface HeroSectionProps {
  slides?: HeroSlide[];
  headline?: string;
  subline?: string;
  tagline?: string;
  /** Seconds each slide holds before crossfading to the next. */
  slideDuration?: number;
}

/** Real, unwatermarked atelier photography — one per key palette note
 * (cobalt, blush, champagne) so the rotation reads as a considered edit,
 * not a random dump of the catalogue. */
const DEFAULT_SLIDES: HeroSlide[] = [
  {
    // Pre-cropped from the catalogue original (public/products/royal-blue-embellished-saree/04.jpg)
    // to drop a wall socket that sat in the last quarter of the frame — see
    // public/hero/cobalt-saree.jpg's history for how the crop was chosen.
    src: "/hero/cobalt-saree.jpg",
    alt: "Hand-embellished cobalt saree, drape caught mid-motion",
    focalPoint: "50% 0%",
  },
  {
    src: "/products/champagne-rose-embellished-set/01.jpg",
    alt: "Champagne bead-embroidered bustier lehenga",
    focalPoint: "50% 0%",
  },
  {
    src: "/products/emerald-anarkali/01.jpg",
    alt: "Blush hand-embroidered anarkali against a candlelit carved wall",
    focalPoint: "50% 0%",
  },
];

export function HeroSection({
  slides = DEFAULT_SLIDES,
  headline = "The House of Dstyle",
  subline = "Indian Couture · Bridal · Festive · Pret",
  // One short line, not a paragraph: the headline and the photograph are the
  // message, and "worn for the moments that matter" was already being said
  // again by the statement band further down the page.
  tagline = "Hand-embroidered, one piece at a time.",
  slideDuration = 6,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const reducedMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);
  const [idleReached, setIdleReached] = useState(false);

  // Slides past the first are geometrically inside the viewport from the very
  // first paint (they are only opacity-0), so Chrome treats them as in-view
  // lazy images and fetches all three hero photographs in the same batch —
  // frames 2 and 3 competing for the first connections with the LCP image, for
  // pictures nobody sees for six seconds. Hold them out of the DOM until the
  // browser goes idle (or the rotation actually needs them, below).
  useEffect(() => {
    if (typeof window.requestIdleCallback !== "function") {
      // Safari only shipped requestIdleCallback in 17.4; on anything older a
      // plain timer is enough, since all we need is "after the first paint".
      const id = window.setTimeout(() => setIdleReached(true), 1500);
      return () => window.clearTimeout(id);
    }
    const id = window.requestIdleCallback(() => setIdleReached(true), { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }, []);

  // A tap on the progress hairlines can outrun the idle callback, so the
  // rotation advancing is itself a mount trigger — the target slide has to
  // exist in the same commit for the crossfade effect to find its ref.
  const secondarySlidesMounted = idleReached || activeSlide !== 0;

  // Intro reveal + scroll parallax on the whole media stack. The eyebrow,
  // tagline and CTAs are deliberately absent: they used to be server-rendered
  // at opacity-0 with only this timeline to clear them, so the hero painted as
  // a photograph with no headline and no buttons until the ~54KB
  // gsap+ScrollTrigger chunk downloaded and hydrated — 2.5-5s on a 4G handset,
  // on the highest-traffic page. They now reveal themselves from CSS (see the
  // .hero-copy-reveal block below) and GSAP is left owning only what CSS
  // cannot do: the per-character stagger and the scroll work.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      const chars = headlineRef.current?.querySelectorAll(".char");
      if (chars && chars.length > 0) {
        tl.fromTo(
          chars,
          { opacity: 0, yPercent: 60, rotateX: -40 },
          {
            opacity: 1,
            yPercent: 0,
            rotateX: 0,
            duration: 1.1,
            stagger: 0.035,
            ease: "power4.out",
          },
          0.35
        );
      }

      tl.fromTo(
        cueRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8 },
        "-=0.3"
      );

      if (!reducedMotion) {
        // force3D: true pins this to the GPU-composited transform path every
        // render. Left on "auto" (GSAP's default), it flip-flops between the
        // composited and non-composited path per-render, which — combined
        // with the will-change hint this element used to carry — raced the
        // hero photo's first paint into a blank compositor layer often enough
        // to matter: the image would report loaded/opacity:1/correct-size in
        // the DOM while rendering solid black, self-healing on any reflow
        // (e.g. a resize). Reproduced via repeated fresh loads in Chrome
        // mobile emulation; not visible in every load, which is exactly the
        // race's signature.
        gsap.to(mediaRef.current, {
          yPercent: 8,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  // Auto-advance the slideshow. Off entirely under reduced-motion, and
  // parked with a single static frame when there's nothing to rotate.
  useEffect(() => {
    if (reducedMotion || slides.length <= 1) return;
    const id = setInterval(() => {
      setActiveSlide((i) => (i + 1) % slides.length);
    }, slideDuration * 1000);
    return () => clearInterval(id);
  }, [reducedMotion, slides.length, slideDuration]);

  // Crossfade whichever slide is active. GSAP (not a CSS opacity transition)
  // so it composes cleanly with the scroll-parallax tween above.
  useEffect(() => {
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.to(el, {
        opacity: i === activeSlide ? 1 : 0,
        duration: 1.4,
        ease: "power2.inOut",
      });
    });
  }, [activeSlide]);

  // Split into words first, chars second — each word is its own nowrap box so
  // the browser can only break the line between words, never through the
  // middle of one, while every letter still gets its own span to stagger.
  const words = headline.split(" ");
  const chars = words.flatMap((word, wi) => {
    const wordSpan = (
      <span key={`w-${wi}`} className="inline-block whitespace-nowrap">
        {word.split("").map((char, ci) => (
          <span key={ci} className="char inline-block will-change-transform">
            {char}
          </span>
        ))}
      </span>
    );
    return wi < words.length - 1 ? [wordSpan, " "] : [wordSpan];
  });

  return (
    <section
      ref={heroRef}
      data-site-hero
      /* The 680px floor is a desktop guard (it stops the hero collapsing on a
         short desktop window) but `md:` is a *width* query, and a landscape
         phone is wide-and-short — 844x390 crossed into md: and got a 680px
         hero in a 390px viewport, pushing the CTA off screen. Gate the floor
         on viewport height too, so landscape phones just track 100dvh. */
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-brand-ink md:h-[100dvh] md:flex-row [@media(min-width:768px)_and_(min-height:640px)]:min-h-[680px]"
    >
      {/* The copy's from-state lives here, inline in the same HTML document as
          the nodes it hides, so nothing — not a stylesheet, and certainly not
          the GSAP chunk — can arrive late and leave the hero blank. The media
          query is the reduced-motion path that matters: it needs no JS, so the
          text is simply visible for those visitors even if the bundle never
          lands (useReducedMotion only gates the GSAP enhancements). */}
      <style>{`
        @keyframes heroCopyReveal {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        .hero-copy-reveal {
          animation: heroCopyReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-copy-reveal { animation: none; }
        }
      `}</style>
      {/* Media — on mobile it fills the section and the copy is overlaid on
          top of it (stacking image *above* the copy pushed the primary CTA
          below the fold on a 375x667 phone, and every peer house overlays
          instead). From md up the photos are portrait studio shots, so the
          media becomes its own column rather than fighting object-cover
          across a landscape viewport. */}
      <div
        ref={mediaRef}
        /* No manual will-change here (see the force3D comment below) — GSAP
           promotes this element to its own compositor layer once it starts
           animating it, and it's the ONE promoting it, consistently, that
           actually matters. */
        className="absolute inset-0 overflow-hidden md:relative md:order-2 md:h-full md:w-[54%]"
      >
        {/* Decorative — the headline/tagline already carry the message, so the
            whole stack is hidden from assistive tech rather than announcing
            three image descriptions back to back for one background. */}
        <div aria-hidden="true" className="absolute inset-0">
          {slides.map((slide, i) =>
            i > 0 && !secondarySlidesMounted ? null : (
              <div
                key={slide.src}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                className={`absolute inset-0 ${!reducedMotion ? "animate-hero-drift" : ""}`}
                style={{ opacity: i === 0 ? 1 : 0 }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 767px) 100vw, 54vw"
                  className="object-cover"
                  style={{ objectPosition: slide.focalPoint ?? "center" }}
                />
              </div>
            )
          )}
        </div>

        {/* Cinematic overlays. media-scrim is the desktop treatment only — on
            mobile it stacked with the reading gradient below and the two
            together muted the photograph into mud. */}
        <div className="pointer-events-none absolute inset-0 media-scrim opacity-0 md:opacity-40" />
        {/* Mobile reading scrim. Weighted to the lower two-thirds where the
            copy actually sits, and deliberately clear above ~72% so the
            model's face keeps its contrast instead of greying out. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(8,6,5,0.94)_0%,rgba(8,6,5,0.84)_28%,rgba(8,6,5,0.70)_48%,rgba(8,6,5,0.28)_68%,rgba(8,6,5,0.04)_82%,transparent_92%)] md:hidden" />
        <div className="pointer-events-none absolute inset-0 media-vignette" />
        <div className="pointer-events-none absolute inset-0 film-grain opacity-[0.1] mix-blend-overlay" />
        {/* Nav-legibility gradient — the header floats transparent over this panel. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />

        {/* Slide progress — thin hairlines, not dots, to stay in the brand's
            square/hairline language. Clickable so the rotation is a real
            lookbook, not just passive scenery. */}
        {slides.length > 1 && (
          // Top-right on mobile (the copy is overlaid across the bottom there,
          // so bottom-left would sit under it), bottom-left from md up where
          // the media is its own column.
          <div className="absolute right-4 top-24 z-10 flex gap-2 md:bottom-8 md:left-8 md:right-auto md:top-auto">
            {slides.map((slide, i) => (
              // The hairline stays 2px visually; the button is padded out to a
              // full 44px touch target (Apple HIG / Material minimum) — a bare
              // 2px hit area repeats the gallery-dot tap-target defect an
              // earlier mobile audit already fixed once.
              <button
                key={slide.src}
                type="button"
                onClick={() => setActiveSlide(i)}
                aria-label={`Show slide ${i + 1} of ${slides.length}`}
                aria-current={i === activeSlide}
                className="group flex h-11 w-10 items-center justify-center md:h-11 md:w-8"
              >
                <span
                  className="h-[2px] w-full bg-white/30 transition-colors duration-300 group-hover:bg-white/60"
                  style={{ backgroundColor: i === activeSlide ? "var(--color-brand-champagne)" : undefined }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content — overlaid on the photo and bottom-aligned on mobile so the
          CTA always lands above the fold; a centred column from md up. */}
      {/* The `md:` copy is vertically centred, which is fine at desktop heights
          where the floating header clears it — but on a landscape phone
          (844x390) centring puts the headline straight through the nav. Pad
          the top back off the header on short md+ viewports only. */}
      <div className="relative z-10 order-2 flex flex-1 items-end justify-center px-6 pb-12 pt-24 text-center sm:px-10 md:order-1 md:w-[46%] md:items-center md:justify-start md:px-14 md:py-0 md:text-left lg:px-20 [@media(min-width:768px)_and_(max-height:640px)]:items-start [@media(min-width:768px)_and_(max-height:640px)]:pt-24">
        <div className="max-w-lg">
          {/* Eyebrow with gold hairline — framed on mobile, left-run on desktop
              where the column itself supplies the left edge. */}
          <div
            className="hero-copy-reveal hero-eyebrow mb-5 flex items-center justify-center gap-4 sm:gap-5 sm:mb-7 md:justify-start"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="hidden h-px w-10 gold-rule-solid opacity-70 sm:block lg:w-14" />
            <span className="micro-label text-[10px] text-brand-champagne">{subline}</span>
            <span className="hidden h-px w-10 gold-rule-solid opacity-70 sm:block md:hidden lg:w-14" />
          </div>

          {/* Headline — the hero is one of only two places italic display type
              is still allowed; everything downstream of it is upright. */}
          <h1
            ref={headlineRef}
            className="display-1 mb-6 italic text-balance text-white sm:mb-8"
            style={{ perspective: "1000px" }}
          >
            {chars}
          </h1>

          <p
            className="hero-copy-reveal hero-tagline mx-auto mb-8 max-w-lg font-sans text-[13px] leading-[1.7] text-white/75 sm:mb-10 sm:text-[14px] md:mx-0"
            style={{ animationDelay: "0.3s" }}
          >
            {tagline}
          </p>

          {/* CTAs — square, flat, no gold fill. The panel is a dark surface,
              so the primary is the inverted (white-fill) button rather than
              ink-on-ink. */}
          <div
            className="hero-copy-reveal mx-auto flex w-full max-w-[340px] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4 md:mx-0 md:justify-start"
            style={{ animationDelay: "0.45s" }}
          >
            <MagneticButton className="w-full sm:w-auto">
              <Link href="/collections" className="btn-invert w-full min-h-[52px] px-10 sm:w-auto">
                Explore Collections
              </Link>
            </MagneticButton>
            <MagneticButton className="w-full sm:w-auto">
              <Link
                href="/about"
                className="btn-secondary w-full min-h-[52px] border-white/70 px-10 text-white hover:bg-white hover:text-brand-ink sm:w-auto"
              >
                Our Story
              </Link>
            </MagneticButton>
          </div>

          {/* Desktop only — on mobile the copy sits over a full-bleed photo
              that already reads as scrollable, and the cue's ~80px would push
              the CTA back toward the fold on a short phone. */}
          <div ref={cueRef} className="mt-10 hidden items-center justify-center gap-3 opacity-0 md:flex md:justify-start">
            <span className="relative block h-10 w-px overflow-hidden bg-white/20">
              <span className="absolute left-0 top-0 h-4 w-full bg-brand-champagne animate-scrollcue" />
            </span>
            <span className="text-[10px] font-sans tracking-luxe uppercase text-brand-champagne/80">Scroll</span>
          </div>
        </div>
      </div>

    </section>
  );
}
