"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useOutsideClick } from "@/hooks/use-outside-click";

export type ExpandableCardItem = {
  title: string;
  label?: string;
  description: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  content: React.ReactNode;
};

/**
 * Aceternity expandable card, re-themed for Dstyle. A grid of cards that morph
 * (shared-element `layoutId`) into a full detail panel on tap. Couture palette,
 * next/image, framer-motion.
 */
export function ExpandableCards({ cards }: { cards: ExpandableCardItem[] }) {
  const [active, setActive] = useState<ExpandableCardItem | null>(null);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }
    document.body.style.overflow = active ? "hidden" : "";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] h-full w-full bg-brand-ink/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 z-[80] grid place-items-center p-4">
            <motion.button
              key={`button-${active.title}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="absolute top-5 right-5 z-[85] flex items-center justify-center h-8 w-8 rounded-full bg-white shadow-md lg:hidden"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              <X size={16} className="text-brand-ink" />
            </motion.button>

            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-[520px] h-full md:h-fit md:max-h-[90%] flex flex-col overflow-hidden bg-brand-ivory sm:rounded-2xl shadow-[0_40px_100px_-30px_rgba(23,19,15,0.5)]"
            >
              <motion.div
                layoutId={`image-${active.title}-${id}`}
                className="relative h-72 sm:h-80 w-full shrink-0"
              >
                <Image src={active.image} alt={active.title} fill className="object-cover object-top" sizes="520px" />
              </motion.div>

              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-4 p-5 lg:p-6">
                  <div className="min-w-0">
                    {active.label && (
                      <motion.p layoutId={`label-${active.title}-${id}`} className="eyebrow mb-2">
                        {active.label}
                      </motion.p>
                    )}
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-display text-2xl lg:text-[1.7rem] leading-tight text-brand-ink"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.description}-${id}`}
                      className="text-[13px] text-brand-ink-soft mt-1.5"
                    >
                      {active.description}
                    </motion.p>
                  </div>

                  {active.ctaText && active.ctaLink && (
                    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Link
                        href={active.ctaLink}
                        onClick={() => setActive(null)}
                        className="shrink-0 inline-block whitespace-nowrap bg-brand-ink px-5 py-3 text-[10px] font-sans font-semibold tracking-luxe uppercase text-white transition-colors hover:bg-brand-gold-deep"
                      >
                        {active.ctaText}
                      </Link>
                    </motion.div>
                  )}
                </div>

                <div className="relative px-5 lg:px-6 pb-6">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4 h-40 md:h-fit md:max-h-64 overflow-auto pb-6 text-[14px] leading-relaxed text-brand-ink-soft [mask:linear-gradient(to_bottom,black,black,transparent)] md:[mask:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {active.content}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {cards.map((card) => (
          <motion.div
            layoutId={`card-${card.title}-${id}`}
            key={card.title}
            onClick={() => setActive(card)}
            className="group flex cursor-pointer flex-col"
          >
            <motion.div
              layoutId={`image-${card.title}-${id}`}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-[4px] bg-brand-ivory-deep"
            >
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-brand-ink/45 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </motion.div>
            <div className="mt-4">
              {card.label && (
                <motion.p layoutId={`label-${card.title}-${id}`} className="eyebrow mb-2">
                  {card.label}
                </motion.p>
              )}
              <motion.h3
                layoutId={`title-${card.title}-${id}`}
                className="font-display text-2xl leading-tight text-brand-ink"
              >
                {card.title}
              </motion.h3>
              <motion.p
                layoutId={`description-${card.description}-${id}`}
                className="text-[13px] text-brand-ink-soft mt-1.5 max-w-[320px]"
              >
                {card.description}
              </motion.p>
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
