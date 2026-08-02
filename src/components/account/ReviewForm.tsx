"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Five-star picker. Renders as radio inputs so it stays keyboard-operable. */
export function StarRating({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange?: (rating: number) => void;
  name?: string;
}) {
  const readOnly = !onChange;

  return (
    <div className="flex items-center gap-1" role={readOnly ? "img" : "radiogroup"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) =>
        readOnly ? (
          <span
            key={star}
            aria-hidden
            className={cn("text-[15px] leading-none", star <= value ? "text-brand-gold" : "text-[#d8d2c8]")}
          >
            ★
          </span>
        ) : (
          <label key={star} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <span
              className={cn(
                "text-[20px] leading-none transition-colors",
                star <= value ? "text-brand-gold" : "text-[#d8d2c8] hover:text-brand-gold/60"
              )}
            >
              ★
            </span>
            <span className="sr-only">{star} stars</span>
          </label>
        )
      )}
    </div>
  );
}

interface ReviewFormProps {
  productId: string;
  productName: string;
  initial?: { rating: number; title: string | null; body: string };
  onDone?: () => void;
}

/** Write or edit a review. Backed by POST /api/account/reviews (upsert). */
export function ReviewForm({ productId, productName, initial, onDone }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Pick a rating first.");
      return;
    }

    setBusy(true);
    setError(null);

    const res = await fetch("/api/account/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title, body }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Could not save your review.");
      return;
    }

    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 border-t border-brand-ivory-deep pt-4">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink">
          Your rating
        </span>
        <StarRating value={rating} onChange={setRating} name={`rating-${productId}`} />
      </div>

      <Input
        id={`review-title-${productId}`}
        label="Headline (optional)"
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`What stood out about ${productName}?`}
      />

      <div className="flex flex-col gap-2">
        <label
          htmlFor={`review-body-${productId}`}
          className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink"
        >
          Your review
        </label>
        <textarea
          id={`review-body-${productId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          required
          className="w-full border border-brand-ivory-deep bg-white px-4 py-3 text-sm font-sans text-brand-ink placeholder:text-[#a89f92] transition-[border-color,box-shadow] duration-300 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
          placeholder="Fit, fabric, how it wears — anything that would help the next person."
        />
      </div>

      {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="sm" loading={busy}>
          {initial ? "Update review" : "Publish review"}
        </Button>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
