"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { reviewSchema, type ReviewInput } from "@/lib/account-schemas";

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
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      productId,
      // 0 is below the schema's minimum, so an untouched picker fails validation
      // with "Pick a rating" instead of silently submitting.
      rating: initial?.rating ?? 0,
      title: initial?.title ?? "",
      body: initial?.body ?? "",
    },
  });

  async function onSubmit(values: ReviewInput) {
    setFormError(null);

    const res = await fetch("/api/account/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFormError(json.error ?? "Could not save your review.");
      return;
    }

    onDone?.();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 border-t border-brand-ivory-deep pt-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink">
          Your rating
        </span>
        {/* The star picker isn't a single input, so it can't be `register`ed —
            `Controller` bridges it to the form state. */}
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <StarRating
              value={field.value}
              onChange={field.onChange}
              name={`rating-${productId}`}
            />
          )}
        />
        {errors.rating && (
          <p className="text-xs font-sans text-brand-wine">{errors.rating.message}</p>
        )}
      </div>

      <Input
        id={`review-title-${productId}`}
        label="Headline (optional)"
        maxLength={120}
        placeholder={`What stood out about ${productName}?`}
        error={errors.title?.message}
        {...register("title")}
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
          rows={4}
          maxLength={2000}
          className="w-full border border-brand-ivory-deep bg-white px-4 py-3 text-sm font-sans text-brand-ink placeholder:text-[#a89f92] transition-[border-color,box-shadow] duration-300 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
          placeholder="Fit, fabric, how it wears — anything that would help the next person."
          {...register("body")}
        />
        {errors.body && (
          <p className="text-xs font-sans text-brand-wine">{errors.body.message}</p>
        )}
      </div>

      {formError && <p className="text-xs font-sans text-brand-wine">{formError}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="sm" loading={isSubmitting}>
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
