"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Magnetic wrapper — the child is pulled gently toward the cursor and springs
 * back on leave. Themed clean (no demo border/background) so it wraps any CTA.
 */
export const MagneticButton = ({
  children,
  strength = 0.4,
  maxDistance = 60,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  maxDistance?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    let x = (e.clientX - (left + width / 2)) * strength;
    let y = (e.clientY - (top + height / 2)) * strength;
    const distance = Math.hypot(x, y);
    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      x *= scale;
      y *= scale;
    }
    setPosition({ x, y });
  };

  const handleMouseLeave = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.1 }}
      className={className ?? "inline-block"}
    >
      {children}
    </motion.div>
  );
};
