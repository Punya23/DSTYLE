"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

/**
 * House sizing chart.
 *
 * These are *body* measurements, not garment measurements, and they are the
 * same for every piece — a per-garment table would have to be invented, and an
 * invented measurement is the one mistake a couture shopper never forgives.
 * Ease varies by cut, which the note under the table says out loud.
 */
const SIZE_ROWS: ReadonlyArray<{ size: string; bust: number; waist: number; hip: number }> = [
  { size: "XS", bust: 32, waist: 26, hip: 35 },
  { size: "S", bust: 34, waist: 28, hip: 37 },
  { size: "M", bust: 36, waist: 30, hip: 39 },
  { size: "L", bust: 38, waist: 32, hip: 41 },
  { size: "XL", bust: 40, waist: 34, hip: 43 },
  { size: "XXL", bust: 42, waist: 36, hip: 45 },
];

const HOW_TO_MEASURE: ReadonlyArray<[string, string]> = [
  ["Bust", "Around the fullest part, tape level and not pulled tight."],
  ["Waist", "Around the narrowest part of the torso, just above the navel."],
  ["Hip", "Around the fullest part, roughly 8 inches below the waist."],
];

interface SizeGuideProps {
  open: boolean;
  onClose: () => void;
  /** Sizes this piece is actually cut in — highlighted in the table. */
  availableSizes?: string[];
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function SizeGuide({ open, onClose, availableSizes = [] }: SizeGuideProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  // The guide can be mounted from the purchase panel, the mobile sheet and the
  // Size & Fit tab at once, so its heading id has to be instance-scoped.
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    // Whatever was focused when the dialog opened is the trigger; focus goes
    // back there on close so keyboard users don't land at the top of the page.
    const trigger = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap the cycle by hand — the dialog isn't in the top layer, so the
      // browser would otherwise let Tab escape into the page behind it.
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    // Restore the previous value rather than clearing it: the guide can open
    // from inside the mobile purchase sheet, which locks scroll itself.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, onClose]);

  const normalized = availableSizes.map((s) => s.trim().toUpperCase());

  return (
    <AnimatePresence>
      {open && (
        // Bottom sheet on phones, centred dialog from `sm` up. `dvh` rather than
        // `vh` so the sheet isn't clipped behind mobile browser chrome.
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            className="absolute inset-0 bg-brand-ink/60"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-sm bg-brand-paper sm:max-w-lg sm:rounded-none"
          >
            <div className="hairline-b flex items-start justify-between gap-4 px-6 py-5 sm:px-8">
              <div className="min-w-0">
                <p className="eyebrow">House sizing</p>
                <h2 id={titleId} className="display-3 not-italic mt-2 text-brand-ink">
                  Size guide
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close size guide"
                className="-mr-2 grid h-11 w-11 shrink-0 place-items-center text-brand-grey-dark transition-colors duration-300 hover:text-brand-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-ink"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* The sheet's own floor clears the iOS home indicator. */}
            <div className="px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left">
                  <caption className="sr-only">
                    Body measurements in inches for each house size
                  </caption>
                  <thead>
                    <tr className="hairline-b">
                      {["Size", "Bust", "Waist", "Hip"].map((head) => (
                        <th
                          key={head}
                          scope="col"
                          className="micro-label pb-3 text-brand-grey-dark"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SIZE_ROWS.map((row) => {
                      const stocked = normalized.includes(row.size);
                      return (
                        <tr key={row.size} className="hairline-b">
                          <th
                            scope="row"
                            className="py-3 text-left font-sans text-[13px] font-medium text-brand-ink"
                          >
                            {row.size}
                            {stocked && (
                              <span className="ml-2 align-middle text-[9px] font-normal tracking-[0.14em] uppercase text-brand-gold">
                                In this piece
                              </span>
                            )}
                          </th>
                          <td className="py-3 font-sans text-[13px] text-brand-ink-soft">{row.bust}&Prime;</td>
                          <td className="py-3 font-sans text-[13px] text-brand-ink-soft">{row.waist}&Prime;</td>
                          <td className="py-3 font-sans text-[13px] text-brand-ink-soft">{row.hip}&Prime;</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="body-copy mt-5">
                All figures are body measurements in inches, taken over
                undergarments. Ease is cut into each garment differently, so a
                piece will measure larger than the numbers above.
              </p>

              <h3 className="micro-label mt-8 text-brand-ink">How to measure</h3>
              <dl className="mt-4 grid grid-cols-[minmax(56px,auto)_1fr] gap-x-6 gap-y-3">
                {HOW_TO_MEASURE.map(([term, detail]) => (
                  <div key={term} className="contents">
                    <dt className="font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-brand-grey-dark">
                      {term}
                    </dt>
                    <dd className="font-sans text-[13px] leading-[1.7] text-brand-ink-soft">
                      {detail}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-8 font-sans text-[12px] leading-[1.7] text-brand-grey-dark">
                Between two sizes, or need a piece cut to your measurements?
                Book an atelier appointment and we will take it from there.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
