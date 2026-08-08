"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * One live coupon, already proven applicable to this product on the server.
 * Everything here is a real column on the Coupon row — this component never
 * composes an offer of its own, so an empty list renders nothing at all.
 */
export interface StoreOffer {
  id: string;
  code: string;
  /** Mirrors the label the coupon engine returns, e.g. "10% off". */
  label: string;
  /** Admin-authored copy, when the row has any. */
  description: string | null;
  /** Conditions derived from real fields: minimum order, cap, expiry. */
  terms: string[];
}

interface ProductOffersProps {
  offers: StoreOffer[];
  className?: string;
}

export function ProductOffers({ offers, className }: ProductOffersProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (offers.length === 0) return null;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      // Clipboard denied (insecure context, or the user said no) — the code is
      // on screen in full, so there is nothing to recover from.
    }
  };

  return (
    <section className={className} aria-labelledby="product-offers-title">
      <h2 id="product-offers-title" className="eyebrow">
        Special offers
      </h2>

      <ul className="mt-4 space-y-2.5">
        {offers.map((offer) => (
          <li
            key={offer.id}
            className="flex items-start gap-3 border border-dashed border-brand-line bg-brand-paper p-4 sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[13px] font-medium text-brand-ink">{offer.label}</p>
              {offer.description && (
                <p className="mt-1 font-sans text-[12px] leading-[1.6] text-brand-ink-soft">
                  {offer.description}
                </p>
              )}
              {offer.terms.length > 0 && (
                <p className="mt-1.5 font-sans text-[11px] leading-[1.6] text-brand-grey-dark">
                  {offer.terms.join(" · ")}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => copy(offer.code)}
              className="group flex min-h-[44px] max-w-[45%] shrink-0 items-center gap-2 border border-brand-line px-3 py-2.5 text-left transition-colors duration-300 hover:border-brand-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-ink"
              aria-label={`Copy coupon code ${offer.code}`}
            >
              <span className="micro-label min-w-0 break-all leading-[1.4] text-brand-ink">
                {offer.code}
              </span>
              {copied === offer.code ? (
                <Check size={13} strokeWidth={1.75} className="shrink-0 text-brand-gold" />
              ) : (
                <Copy size={13} strokeWidth={1.5} className="shrink-0 text-brand-grey-dark" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="sr-only">
        {copied ? `Coupon code ${copied} copied` : ""}
      </p>
    </section>
  );
}
