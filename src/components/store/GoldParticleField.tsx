"use client";

import { useMemo, useRef, useState, useEffect, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Ambient WebGL backdrop for the footer — a slow drift of warm gold dust,
 * standing in for the literal 3D garment showcase the catalogue can't offer
 * (no 3D-scanned pieces yet). Deliberately restrained: brand-toned, quiet
 * motion, never competes with the newsletter copy sitting on top of it.
 *
 * Gated behind an IntersectionObserver so the WebGL context only spins up
 * once the footer is actually near the viewport, and skipped entirely for
 * prefers-reduced-motion.
 */

const COLORS = ["#d9c19a", "#a97c48", "#f2e5c8"]; // champagne, gold, pale gold

/** Deterministic PRNG (mulberry32) — keeps particle layout a pure function of
 * its seed, so generation can live in useMemo without violating React's
 * render-purity rules (Math.random() during render is disallowed). */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useReducedMotion() {
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

function Dust({ count = 260, seed = 1337 }: { count?: number; seed?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const rand = mulberry32(seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const palette = COLORS.map((c) => new THREE.Color(c));

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 16;
      positions[i * 3 + 1] = (rand() - 0.5) * 9;
      positions[i * 3 + 2] = (rand() - 0.5) * 6;

      const c = palette[Math.floor(rand() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = rand() * 0.045 + 0.015;
    }
    return { positions, colors, sizes };
  }, [count, seed]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    // Gentle continuous drift + a very slow overall rotation — ambient, not busy.
    pointsRef.current.rotation.y = t * 0.02;
    pointsRef.current.position.y = Math.sin(t * 0.08) * 0.25;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function GoldParticleField({ className }: { className?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className={className} aria-hidden="true">
      {active && !reducedMotion && (
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
        >
          <Dust />
        </Canvas>
      )}
    </div>
  );
}
