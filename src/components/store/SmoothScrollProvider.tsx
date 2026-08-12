"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // gsap, ScrollTrigger and lenis are ~144 kB raw of purely decorative JS and this
    // provider lives in the root layout, so a static import billed every route for
    // them before hydration — including /checkout and /account, which have no smooth
    // scroll or parallax at all. None of it contributes to first paint, so it loads
    // here at runtime instead of riding along in the entry bundle.
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      // A navigation can unmount this provider while the three chunks are still in
      // flight. The cleanup below has already run by then, so anything constructed
      // past this point would hijack scrolling forever with nothing left to tear it
      // down.
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      lenisRef.current = lenis;

      lenis.on("scroll", ScrollTrigger.update);

      // Held in a variable because gsap.ticker.remove matches by identity: the
      // freshly-allocated arrow this teardown used to pass matched nothing, leaving a
      // callback driving a destroyed Lenis after every unmount.
      const raf = (time: number) => {
        lenis.raf(time * 1000);
      };

      gsap.ticker.add(raf);

      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        lenis.destroy();
        gsap.ticker.remove(raf);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
