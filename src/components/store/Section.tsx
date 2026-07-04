"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal-on-scroll wrapper — bulletproof by design:
 *  - Uses the `.reveal` / `.is-in` CSS classes (so `prefers-reduced-motion`
 *    shows content instantly via the media query).
 *  - Reveals via IntersectionObserver on scroll.
 *  - A timeout fallback flips it visible no matter what, so a section can
 *    NEVER stay stuck hidden (the old GSAP scroll-trigger failure mode).
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);

    // Safety net: never leave content hidden.
    const t = window.setTimeout(() => setShown(true), 1400);

    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", shown && "is-in", className)}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/** The single, consistent section-heading pattern used site-wide. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  light = false,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: string;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
}) {
  return (
    <Reveal
      className={cn("flex flex-col", align === "center" && "items-center text-center", className)}
    >
      {eyebrow && <span className={cn("eyebrow mb-4", light && "eyebrow-light")}>{eyebrow}</span>}
      <h2 className={cn("display-2 text-balance", light ? "text-white" : "text-brand-ink")}>
        {title}
      </h2>
      {intro && (
        <p
          className={cn(
            "mt-5 max-w-xl text-[15px] leading-relaxed text-pretty",
            align === "center" && "mx-auto",
            light ? "text-white/70" : "text-brand-ink-soft"
          )}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}
