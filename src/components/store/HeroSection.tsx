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
  tagline = "Hand-embroidered in our atelier — worn for the moments that matter most.",
  slideDuration = 6,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const reducedMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);

  // Intro reveal + scroll parallax on the whole media stack.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.9 },
        0.2
      );

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
        taglineRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.9 },
        "-=0.5"
      );

      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.55"
      );

      tl.fromTo(
        cueRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8 },
        "-=0.3"
      );

      if (!reducedMotion) {
        gsap.to(mediaRef.current, {
          yPercent: 8,
          ease: "none",
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
      className="relative flex flex-col overflow-hidden bg-brand-ink md:h-[100dvh] md:min-h-[680px] md:flex-row"
    >
      {/* Media panel — every source photo is a portrait studio shot, so this
          runs as its own column (not a full-bleed background) rather than
          fight object-cover across a landscape viewport. Full-bleed only
          collapses back in on mobile, where the viewport is portrait too. */}
      <div
        ref={mediaRef}
        className="relative order-1 h-[62dvh] min-h-[420px] w-full overflow-hidden will-change-transform md:order-2 md:h-full md:w-[54%]"
      >
        {/* Decorative — the headline/tagline already carry the message, so the
            whole stack is hidden from assistive tech rather than announcing
            three image descriptions back to back for one background. */}
        <div aria-hidden="true" className="absolute inset-0">
          {slides.map((slide, i) => (
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
          ))}
        </div>

        {/* Cinematic overlays */}
        <div className="pointer-events-none absolute inset-0 media-scrim opacity-70 md:opacity-40" />
        <div className="pointer-events-none absolute inset-0 media-vignette" />
        <div className="pointer-events-none absolute inset-0 film-grain opacity-[0.1] mix-blend-overlay" />
        {/* Nav-legibility gradient — the header floats transparent over this panel. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />

        {/* Slide progress — thin hairlines, not dots, to stay in the brand's
            square/hairline language. Clickable so the rotation is a real
            lookbook, not just passive scenery. */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-6 z-10 flex gap-2 md:bottom-8 md:left-8">
            {slides.map((slide, i) => (
              // The hairline stays 2px visually; the button itself is padded
              // out to a real touch target (a bare 2px hit area repeats the
              // gallery-dot tap-target defect an earlier mobile audit fixed).
              <button
                key={slide.src}
                type="button"
                onClick={() => setActiveSlide(i)}
                aria-label={`Show slide ${i + 1} of ${slides.length}`}
                aria-current={i === activeSlide}
                className="group flex h-6 w-8 items-center justify-center"
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

      {/* Content panel */}
      <div className="relative z-10 order-2 flex flex-1 items-center justify-center px-6 py-14 text-center sm:px-10 md:order-1 md:w-[46%] md:justify-start md:px-14 md:py-0 md:text-left lg:px-20">
        <div className="max-w-lg">
          {/* Eyebrow with gold hairline — framed on mobile, left-run on desktop
              where the column itself supplies the left edge. */}
          <div
            ref={eyebrowRef}
            className="mb-5 flex items-center justify-center gap-4 opacity-0 sm:gap-5 sm:mb-7 md:justify-start"
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
            ref={taglineRef}
            className="mx-auto mb-8 max-w-lg font-sans text-[13px] leading-[1.7] text-white/75 opacity-0 sm:mb-10 sm:text-[14px] md:mx-0"
          >
            {tagline}
          </p>

          {/* CTAs — square, flat, no gold fill. The panel is a dark surface,
              so the primary is the inverted (white-fill) button rather than
              ink-on-ink. */}
          <div
            ref={ctaRef}
            className="mx-auto flex w-full max-w-[340px] flex-col items-stretch justify-center gap-3 opacity-0 sm:max-w-none sm:flex-row sm:items-center sm:gap-4 md:mx-0 md:justify-start"
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

          <div ref={cueRef} className="mt-10 flex items-center justify-center gap-3 opacity-0 md:justify-start">
            <span className="relative block h-10 w-px overflow-hidden bg-white/20">
              <span className="absolute left-0 top-0 h-4 w-full bg-brand-champagne animate-[scrollcue_1.8s_ease-in-out_infinite]" />
            </span>
            <span className="text-[10px] font-sans tracking-luxe uppercase text-brand-champagne/80">Scroll</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scrollcue {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(250%); }
        }
      `}</style>
    </section>
  );
}
