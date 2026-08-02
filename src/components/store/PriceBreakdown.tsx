"use client";

import { Check, Tag, X } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatPrice, cn } from "@/lib/utils";
import type { Quote } from "@/lib/pricing";

/**
 * The bill: subtotal, coupon, GST, shipping, total. Rendered identically in
 * the cart drawer and at checkout so the number never appears to change as
 * the shopper moves between them.
 */
export function PriceBreakdown({
  quote,
  loading = false,
  className,
}: {
  quote: Quote;
  loading?: boolean;
  className?: string;
}) {
  const row = "flex justify-between text-[12px] font-sans";

  return (
    <div className={cn("space-y-2", loading && "opacity-60 transition-opacity", className)}>
      <div className={cn(row, "text-[#888888]")}>
        <span>Subtotal</span>
        <span>{formatPrice(quote.subtotal)}</span>
      </div>

      {quote.discount > 0 && (
        <div className={cn(row, "text-brand-gold-deep")}>
          <span className="inline-flex items-center gap-1.5">
            <Tag size={11} />
            {quote.coupon?.code ?? "Discount"}
          </span>
          <span>−{formatPrice(quote.discount)}</span>
        </div>
      )}

      {quote.tax > 0 && (
        <div className={cn(row, "text-[#888888]")}>
          {/* Inclusive pricing means the tax is already inside the subtotal —
              showing it as a separate addition would double-count it. */}
          <span>{quote.taxInclusive ? "Includes GST" : "GST"}</span>
          <span>
            {quote.taxInclusive ? "" : "+"}
            {formatPrice(quote.tax)}
          </span>
        </div>
      )}

      <div className={cn(row, "text-[#888888]")}>
        <span>Shipping</span>
        <span>
          {quote.shipping === 0 ? (
            <span className="text-brand-gold-deep">Complimentary</span>
          ) : (
            formatPrice(quote.shipping)
          )}
        </span>
      </div>

      {quote.codFee > 0 && (
        <div className={cn(row, "text-[#888888]")}>
          <span>Cash on delivery fee</span>
          <span>{formatPrice(quote.codFee)}</span>
        </div>
      )}

      <div className="flex justify-between text-[14px] font-sans font-medium text-black border-t border-brand-ivory-deep pt-3 mt-3">
        <span>Total</span>
        <span>{formatPrice(quote.total)}</span>
      </div>

      {quote.freeShippingGap > 0 && (
        <p className="text-[11px] font-sans text-brand-gold-deep pt-1">
          Add {formatPrice(quote.freeShippingGap)} more for complimentary shipping.
        </p>
      )}
    </div>
  );
}

/**
 * Coupon entry. The code is held in the cart store; validity is decided by the
 * server on the next quote, so `error` is passed in rather than computed here.
 */
export function CouponField({
  error,
  applied,
  className,
}: {
  error?: string | null;
  applied?: Quote["coupon"];
  className?: string;
}) {
  const couponCode = useCartStore((s) => s.couponCode);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const [draft, setDraft] = useState("");

  // A code that survived validation shows as a removable chip.
  if (applied) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center justify-between gap-3 border border-brand-gold/40 bg-brand-gold/5 px-3.5 py-2.5">
          <span className="flex items-center gap-2 min-w-0">
            <Check size={13} className="text-brand-gold-deep shrink-0" />
            <span className="text-[12px] font-sans font-medium text-black truncate">
              {applied.code}
            </span>
            <span className="text-[11px] font-sans text-[#888888] truncate">
              {applied.label}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              applyCoupon(null);
              setDraft("");
            }}
            className="shrink-0 p-1 text-[#888888] hover:text-brand-wine transition-colors"
            aria-label="Remove coupon"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  const submit = () => {
    const code = draft.trim();
    if (code) applyCoupon(code);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Coupon code"
          aria-label="Coupon code"
          className="flex-1 min-w-0 border border-brand-ivory-deep bg-white px-3 py-2.5 text-[12px] font-sans tracking-wide text-black uppercase placeholder:text-[#ccc] placeholder:normal-case focus:outline-none focus:border-brand-gold transition-colors"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          style={{ backgroundColor: "var(--color-brand-ink)", color: "#ffffff" }}
          className="shrink-0 px-4 text-[10px] font-sans tracking-luxe uppercase transition-[filter,opacity] hover:brightness-125 disabled:opacity-40"
        >
          Apply
        </button>
      </div>

      {/* A rejected code stays applied so the reason keeps showing; clearing it
          is explicit rather than silent. */}
      {error && couponCode && (
        <p className="text-[11px] font-sans text-brand-wine leading-snug">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              applyCoupon(null);
              setDraft("");
            }}
            className="underline underline-offset-2 hover:text-black transition-colors"
          >
            Remove
          </button>
        </p>
      )}
    </div>
  );
}
