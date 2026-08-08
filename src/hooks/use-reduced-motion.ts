"use client";

import { useSyncExternalStore } from "react";

/**
 * Live `prefers-reduced-motion: reduce` read. useSyncExternalStore keeps it
 * tear-free under concurrent rendering and gives a safe `false` server
 * snapshot (no window at SSR time) instead of guessing and flashing motion
 * on hydration for users who asked not to see it.
 */
export function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false // server snapshot
  );
}
