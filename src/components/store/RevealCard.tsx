"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// three.js is only fetched the first time a card is actually hovered.
const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/aceternity/canvas-reveal-effect").then((m) => m.CanvasRevealEffect),
  { ssr: false }
);

/**
 * A card that fades to ink and reveals a shimmering gold dot-matrix (Aceternity
 * canvas-reveal, three.js) on hover. Lazy + hover-gated so it never costs
 * anything until a visitor interacts. Content should use `group-hover:` to flip
 * to light text over the dark reveal.
 */
export function RevealCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-active={hovered ? "true" : "false"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative overflow-hidden transition-colors duration-500",
        hovered ? "bg-brand-ink" : "bg-transparent",
        className
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <CanvasRevealEffect
              animationSpeed={4}
              colors={[
                [169, 124, 72],
                [217, 193, 154],
              ]}
              dotSize={2}
              containerClassName="bg-brand-ink"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
}
