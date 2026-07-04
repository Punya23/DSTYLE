"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MagneticButton } from "@/components/ui/aceternity/magnetic-button";

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  videoUrl?: string;
  headline?: string;
  subline?: string;
  tagline?: string;
}

export function HeroSection({
  videoUrl = "",
  headline = "The House of Dstyle",
  subline = "Indian Couture · Bridal · Festive · Pret",
  tagline = "Hand-embroidered in our atelier — worn for the moments that matter most.",
}: HeroSectionProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Eyebrow: gold hairlines draw out, label fades up
      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.9 },
        0.2
      );

      // Headline: per-character reveal
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
        scrollCueRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8 },
        "-=0.3"
      );

      // Parallax drift of the media on scroll
      gsap.to(mediaRef.current, {
        yPercent: 18,
        scale: 1.16,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const chars = headline.split("").map((char, i) => (
    <span key={i} className="char inline-block will-change-transform" style={{ whiteSpace: char === " " ? "pre" : "normal" }}>
      {char === " " ? " " : char}
    </span>
  ));

  return (
    <section
      ref={heroRef}
      className="relative h-[100dvh] min-h-[560px] md:min-h-[680px] flex items-center justify-center overflow-hidden bg-brand-ink"
    >
      {/* Media layer (video / gradient fallback) */}
      <div ref={mediaRef} className="absolute inset-0 will-change-transform">
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1512] via-[#0b0a09] to-[#241a12]" />
        )}
      </div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 media-scrim pointer-events-none" />
      <div className="absolute inset-0 media-vignette pointer-events-none" />
      <div className="absolute inset-0 film-grain opacity-[0.13] mix-blend-overlay pointer-events-none" />
      {/* Nav-legibility gradient at top */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 sm:px-8 max-w-5xl mx-auto">
        {/* Eyebrow with gold hairlines */}
        <div
          ref={eyebrowRef}
          className="opacity-0 flex items-center justify-center gap-4 sm:gap-5 mb-6 sm:mb-8"
        >
          <span className="hidden sm:block h-px w-10 lg:w-16 gold-rule-solid opacity-70" />
          <span className="text-[9px] sm:text-[11px] font-sans font-medium tracking-[0.2em] sm:tracking-luxe uppercase text-brand-champagne">
            {subline}
          </span>
          <span className="hidden sm:block h-px w-10 lg:w-16 gold-rule-solid opacity-70" />
        </div>

        {/* Headline */}
        <h1
          ref={headlineRef}
          className="font-display italic text-white text-balance text-[2.6rem] leading-[1.02] sm:text-6xl md:text-7xl lg:text-8xl xl:text-[8.5rem] mb-7 sm:mb-9"
          style={{ perspective: "1000px", textShadow: "0 2px 40px rgba(0,0,0,0.35)" }}
        >
          {chars}
        </h1>

        {/* Supporting tagline */}
        <p
          ref={taglineRef}
          className="opacity-0 max-w-xl mx-auto text-white/75 font-sans font-light text-[13px] sm:text-[15px] leading-relaxed tracking-wide mb-9 sm:mb-11"
        >
          {tagline}
        </p>

        {/* CTAs */}
        <div
          ref={ctaRef}
          className="opacity-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-[340px] sm:max-w-none mx-auto"
        >
          <MagneticButton className="w-full sm:w-auto">
            <Link
              href="/collections"
              className="flex items-center justify-center w-full sm:w-auto min-h-[54px] px-10 bg-brand-champagne text-brand-ink text-[11px] font-sans font-semibold tracking-luxe uppercase transition-colors duration-300 hover:bg-white"
            >
              Explore Collections
            </Link>
          </MagneticButton>
          <MagneticButton className="w-full sm:w-auto">
            <Link
              href="/about"
              className="group flex items-center justify-center gap-2.5 w-full sm:w-auto min-h-[54px] px-10 bg-white/10 backdrop-blur-md text-white text-[11px] font-sans font-medium tracking-luxe uppercase transition-colors duration-300 hover:bg-white hover:text-brand-ink"
            >
              Our Story
              <span className="h-px w-5 bg-current transition-all duration-300 group-hover:w-8" />
            </Link>
          </MagneticButton>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        ref={scrollCueRef}
        className="opacity-0 absolute bottom-7 sm:bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-[9px] font-sans tracking-luxe uppercase text-brand-champagne/80">Scroll</span>
        <span className="relative block h-10 w-px bg-white/20 overflow-hidden">
          <span className="absolute top-0 left-0 h-4 w-full bg-brand-champagne animate-[scrollcue_1.8s_ease-in-out_infinite]" />
        </span>
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
