"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { formatPrice } from "@/lib/utils";
import { isVideoUrl } from "@/lib/media";
import type { Product } from "@/types";

/**
 * "Find Your Dstyle" — a short, on-brand style quiz. Pure client-side scoring
 * weights the four collections from the shopper's answers, then reveals the best
 * match with live picks and a warm hand-off to the AI stylist (seeded with the
 * answers) or the collection edit. A marketing/engagement piece — no backend.
 */

type Collection = "bridal" | "festive" | "cocktail" | "pret";

type Option = {
  label: string;
  hint?: string;
  weights: Partial<Record<Collection, number>>;
  /** A short phrase captured for the stylist hand-off. */
  note: string;
};

type Question = { id: string; prompt: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    id: "occasion",
    prompt: "What are you dressing for?",
    options: [
      { label: "I'm the bride", weights: { bridal: 3 }, note: "I'm the bride" },
      { label: "A wedding I'm attending", weights: { festive: 3 }, note: "a wedding I'm attending" },
      { label: "A cocktail or reception", weights: { cocktail: 3 }, note: "a cocktail evening" },
      { label: "Everyday elegance", weights: { pret: 3 }, note: "everyday wear" },
    ],
  },
  {
    id: "mood",
    prompt: "Which mood is most you?",
    options: [
      { label: "Timeless & regal", weights: { bridal: 2, festive: 1 }, note: "timeless and regal" },
      { label: "Bold & glamorous", weights: { cocktail: 2, festive: 1 }, note: "bold and glamorous" },
      { label: "Soft & romantic", weights: { festive: 2, bridal: 1 }, note: "soft and romantic" },
      { label: "Effortless & modern", weights: { pret: 2, cocktail: 1 }, note: "effortless and modern" },
    ],
  },
  {
    id: "palette",
    prompt: "A palette you're drawn to?",
    options: [
      { label: "Jewel tones", weights: { cocktail: 1, bridal: 1 }, note: "jewel tones" },
      { label: "Blush & pastels", weights: { festive: 1, bridal: 1 }, note: "blush and pastels" },
      { label: "Ivory & gold", weights: { bridal: 2 }, note: "ivory and gold" },
      { label: "Bright & playful", weights: { festive: 1, pret: 1 }, note: "bright, playful colour" },
    ],
  },
  {
    id: "shine",
    prompt: "How much shine feels right?",
    options: [
      { label: "Understated", weights: { pret: 2 }, note: "understated" },
      { label: "Beautifully balanced", weights: { festive: 1, cocktail: 1 }, note: "balanced" },
      { label: "All-out glamour", weights: { cocktail: 2, bridal: 1 }, note: "all-out glamour" },
    ],
  },
  {
    id: "budget",
    prompt: "Your comfortable range?",
    options: [
      { label: "Under ₹30k", weights: { pret: 1 }, note: "a budget under ₹30,000" },
      { label: "₹30k – ₹60k", weights: { festive: 1 }, note: "a budget of ₹30,000–₹60,000" },
      { label: "₹60k – ₹1L", weights: { cocktail: 1 }, note: "a budget of ₹60,000–₹1,00,000" },
      { label: "₹1L and above", weights: { bridal: 1 }, note: "a budget above ₹1,00,000" },
    ],
  },
];

const RESULT: Record<
  Collection,
  { name: string; slug: string; line: string }
> = {
  bridal: {
    name: "Bridal",
    slug: "bridal",
    line: "You're drawn to pieces made for the moment everyone remembers — hand-embroidered, regal, unmistakably the main event.",
  },
  festive: {
    name: "Festive",
    slug: "festive",
    line: "You dress for celebration — colour, movement and craft that carry you through every rasm and ritual.",
  },
  cocktail: {
    name: "Cocktail",
    slug: "cocktail",
    line: "Yours is evening glamour with an Indian soul — sculpted, modern, made to turn heads at the reception.",
  },
  pret: {
    name: "Pret",
    slug: "pret",
    line: "You love refined ease — luxury you can actually live in, day to day, with nothing overdone.",
  },
};

const COLLECTIONS: Collection[] = ["bridal", "festive", "cocktail", "pret"];

export function StyleQuiz() {
  const { openStylistWith } = useUIStore();
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<Option[]>([]);
  const [result, setResult] = useState<Collection | null>(null);
  const [picks, setPicks] = useState<Product[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  const total = QUESTIONS.length;

  const finish = async (all: Option[]) => {
    const score: Record<Collection, number> = { bridal: 0, festive: 0, cocktail: 0, pret: 0 };
    for (const opt of all) {
      for (const c of COLLECTIONS) score[c] += opt.weights[c] ?? 0;
    }
    // Highest score wins; ties fall back to the occasion answer (first question).
    let winner: Collection = COLLECTIONS[0];
    for (const c of COLLECTIONS) if (score[c] > score[winner]) winner = c;
    setResult(winner);

    setLoadingPicks(true);
    try {
      const res = await fetch(`/api/products?collection=${winner}&limit=3`, { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      setPicks((data?.products ?? []).slice(0, 3));
    } catch {
      setPicks([]);
    } finally {
      setLoadingPicks(false);
    }
  };

  const answer = (opt: Option) => {
    const all = [...chosen, opt];
    setChosen(all);
    if (step + 1 < total) setStep(step + 1);
    else finish(all);
  };

  const restart = () => {
    setStep(0);
    setChosen([]);
    setResult(null);
    setPicks([]);
  };

  const stylistSeed = () => {
    const notes = chosen.map((c) => c.note);
    // notes[0] = occasion, then mood/palette/shine/budget
    const occasion = notes[0] ?? "a special occasion";
    const rest = notes.slice(1).filter(Boolean);
    return `I'm dressing for ${occasion}. I like ${rest.slice(0, -1).join(", ")}${
      rest.length > 1 ? " and " : ""
    }${rest[rest.length - 1] ?? ""}. What would you suggest?`;
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AnimatePresence mode="wait">
        {result === null ? (
          <motion.div
            key={`q-${step}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Progress */}
            <div className="flex items-center justify-center gap-1.5 mb-8">
              {QUESTIONS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step ? "w-8 bg-brand-gold" : i < step ? "w-4 bg-brand-gold/50" : "w-4 bg-brand-ivory-deep"
                  }`}
                />
              ))}
            </div>

            <p className="text-center text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-3">
              Question {step + 1} of {total}
            </p>
            <h2 className="text-center font-display italic text-3xl sm:text-4xl text-brand-ink mb-9">
              {QUESTIONS[step].prompt}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => answer(opt)}
                  className="group flex items-center justify-between gap-3 bg-white border border-brand-ivory-deep px-5 py-4 text-left transition-all duration-200 hover:border-brand-ink hover:shadow-[0_10px_30px_-16px_rgba(23,19,15,0.5)] active:scale-[0.99]"
                >
                  <span className="text-[14px] font-sans text-brand-ink">{opt.label}</span>
                  <ArrowRight
                    size={15}
                    className="text-brand-ink/30 transition-all duration-200 group-hover:text-brand-gold group-hover:translate-x-0.5"
                  />
                </button>
              ))}
            </div>

            {step > 0 && (
              <button
                onClick={() => {
                  setChosen(chosen.slice(0, -1));
                  setStep(step - 1);
                }}
                className="mx-auto mt-8 block text-[11px] font-sans tracking-luxe uppercase text-brand-ink/40 hover:text-brand-ink transition-colors"
              >
                ← Back
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-3">
              Your Dstyle
            </p>
            <h2 className="font-display italic text-4xl sm:text-5xl text-brand-ink mb-4">
              The {RESULT[result].name} Edit
            </h2>
            <p className="mx-auto max-w-md text-[14px] font-sans leading-relaxed text-brand-ink-soft mb-8">
              {RESULT[result].line}
            </p>

            {/* Picks */}
            {loadingPicks ? (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-brand-ivory-deep animate-pulse rounded-[4px]" />
                ))}
              </div>
            ) : picks.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {picks.map((p) => {
                  const img = p.images.find((im) => im.isPrimary) ?? p.images[0];
                  return (
                    <Link key={p.id} href={`/products/${p.slug}`} className="group block text-left">
                      <div className="relative aspect-[3/4] overflow-hidden bg-brand-ivory-deep rounded-[4px]">
                        {img && !isVideoUrl(img.url) && (
                          <Image
                            src={img.url}
                            alt={p.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 33vw, 200px"
                          />
                        )}
                      </div>
                      <p className="mt-2 text-[11px] font-sans text-brand-ink leading-tight line-clamp-1">{p.name}</p>
                      {p.skus.length > 0 && (
                        <p className="text-[11px] font-sans text-brand-gold">
                          {formatPrice(Math.min(...p.skus.map((s) => s.price)))}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Link
                href={`/collections?collection=${RESULT[result].slug}`}
                style={{ backgroundColor: "var(--color-brand-ink)", color: "#ffffff" }}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[11px] font-sans font-semibold tracking-luxe uppercase transition-[filter] hover:brightness-125"
              >
                View the {RESULT[result].name} Edit
                <ArrowRight size={14} />
              </Link>
              <button
                onClick={() => openStylistWith(stylistSeed())}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[11px] font-sans font-semibold tracking-luxe uppercase border border-brand-ink text-brand-ink transition-colors hover:bg-brand-ink hover:text-white"
              >
                <Sparkles size={14} />
                Refine with the Stylist
              </button>
            </div>

            <button
              onClick={restart}
              className="mx-auto mt-8 flex items-center gap-2 text-[11px] font-sans tracking-luxe uppercase text-brand-ink/40 hover:text-brand-ink transition-colors"
            >
              <RotateCcw size={12} />
              Retake the quiz
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
