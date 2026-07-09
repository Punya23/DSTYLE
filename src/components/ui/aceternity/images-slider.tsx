"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ImagesSliderProps {
  images: string[];
  children?: React.ReactNode;
  overlay?: boolean;
  overlayClassName?: string;
  className?: string;
  autoplay?: boolean;
  direction?: "up" | "down";
  /** Marks the first slide high-priority for LCP — set true only for above-the-fold heroes. */
  priority?: boolean;
}

/**
 * Aceternity images-slider, rebuilt on next/image for real hosting performance:
 * every slide mounts once (so Next fetches optimized AVIF/WebP variants as soon
 * as they're in view — no blank "loading all images" gate, no raw unoptimized
 * <img>), and switching slides is a pure GPU opacity/scale crossfade with
 * nothing left to fetch.
 */
export function ImagesSlider({
  images,
  children,
  overlay = true,
  overlayClassName,
  className,
  autoplay = true,
  direction = "up",
  priority = false,
}: ImagesSliderProps) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  const previous = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKeyDown);

    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoplay && images.length > 1) {
      interval = setInterval(next, 5000);
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (interval) clearInterval(interval);
    };
  }, [autoplay, images.length, next, previous]);

  const offscreenY = direction === "up" ? "-2%" : "2%";

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 pointer-events-none">
        {images.map((src, i) => (
          <motion.div
            key={src}
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity: i === index ? 1 : 0,
              scale: i === index ? 1 : 1.04,
              y: i === index ? 0 : offscreenY,
            }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src={src}
              alt=""
              fill
              priority={priority && i === 0}
              className="object-cover object-center"
              sizes="100vw"
            />
          </motion.div>
        ))}
      </div>

      {overlay && <div className={cn("absolute inset-0 z-30", overlayClassName)} />}
      {children && <div className="relative z-40 w-full">{children}</div>}
    </div>
  );
}
