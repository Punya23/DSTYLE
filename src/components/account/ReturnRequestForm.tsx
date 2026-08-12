"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { RETURN_REASONS } from "@/lib/account";
import { formatPrice } from "@/lib/utils";
import { returnRequestSchema, type ReturnRequestInput } from "@/lib/account-schemas";

export interface ReturnableItem {
  id: string;
  productName: string;
  size: string;
  quantity: number;
  lineTotal: number;
  image: string | null;
}

/** Pick items, give a reason, submit. Backed by POST /api/account/returns. */
export function ReturnRequestForm({
  orderId,
  items,
}: {
  orderId: string;
  items: ReturnableItem[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReturnRequestInput>({
    resolver: zodResolver(returnRequestSchema),
    defaultValues: { orderId, reason: RETURN_REASONS[0], comment: "", items: [] },
  });

  // The selection lives in form state so the "at least one item" rule is
  // enforced by the same schema the API uses, not by a separate hand-check.
  // `useWatch` rather than `watch` — the latter returns a fresh function each
  // render, which makes the React Compiler skip memoizing the whole component.
  const lines = useWatch({ control, name: "items" });
  const selected: Record<string, number> = Object.fromEntries(
    lines.map((line) => [line.orderItemId, line.quantity])
  );

  function toggle(item: ReturnableItem) {
    const next = lines.some((line) => line.orderItemId === item.id)
      ? lines.filter((line) => line.orderItemId !== item.id)
      : [...lines, { orderItemId: item.id, quantity: item.quantity }];
    setValue("items", next, { shouldValidate: true });
  }

  function setQuantity(item: ReturnableItem, quantity: number) {
    const clamped = Math.min(Math.max(quantity, 1), item.quantity);
    setValue(
      "items",
      lines.map((line) =>
        line.orderItemId === item.id ? { ...line, quantity: clamped } : line
      ),
      { shouldValidate: true }
    );
  }

  async function onSubmit(values: ReturnRequestInput) {
    setFormError(null);

    const res = await fetch("/api/account/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFormError(json.error ?? "Could not raise this return.");
      return;
    }

    router.push("/account/returns");
    router.refresh();
  }

  const refundEstimate = items
    .filter((item) => selected[item.id])
    .reduce((sum, item) => sum + (item.lineTotal / item.quantity) * selected[item.id], 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <section className="border border-brand-ivory-deep bg-white p-6">
        <h3 className="mb-4 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          Which pieces are you returning?
        </h3>

        <div className="space-y-4">
          {items.map((item) => {
            const chosen = Boolean(selected[item.id]);
            return (
              <div key={item.id} className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id={`return-item-${item.id}`}
                  checked={chosen}
                  onChange={() => toggle(item)}
                  className="mt-1 accent-brand-gold"
                />
                <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-brand-ivory-deep">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`return-item-${item.id}`}
                    className="text-[13px] font-sans font-medium text-black"
                  >
                    {item.productName}
                  </label>
                  <p className="text-[11px] font-sans text-[#888888]">
                    Size {item.size} · Ordered {item.quantity} · {formatPrice(item.lineTotal)}
                  </p>

                  {chosen && item.quantity > 1 && (
                    <label className="mt-2 flex items-center gap-2 text-[11px] font-sans text-[#666666]">
                      Quantity to return
                      <input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={selected[item.id]}
                        onChange={(e) => setQuantity(item, Number(e.target.value))}
                        className="w-16 border border-brand-ivory-deep px-2 py-1 text-[12px] focus:border-brand-gold focus:outline-none"
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {errors.items && (
          <p className="mt-4 text-xs font-sans text-brand-wine">{errors.items.message}</p>
        )}
      </section>

      <section className="space-y-4 border border-brand-ivory-deep bg-white p-6">
        <h3 className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          Why are you sending it back?
        </h3>

        <div className="flex flex-col gap-2">
          {RETURN_REASONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 text-[12px] font-sans text-[#666666]"
            >
              <input
                type="radio"
                value={option}
                className="accent-brand-gold"
                {...register("reason")}
              />
              {option}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="return-comment"
            className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink"
          >
            Anything else? (optional)
          </label>
          <textarea
            id="return-comment"
            rows={3}
            maxLength={1000}
            className="w-full border border-brand-ivory-deep bg-white px-4 py-3 text-sm font-sans text-brand-ink placeholder:text-[#a89f92] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
            {...register("comment")}
          />
          {errors.comment && (
            <p className="text-xs font-sans text-brand-wine">{errors.comment.message}</p>
          )}
        </div>
      </section>

      {refundEstimate > 0 && (
        <p className="text-[12px] font-sans text-[#666666]">
          Estimated refund{" "}
          <span className="font-medium text-black">{formatPrice(refundEstimate)}</span> — confirmed
          once we receive and inspect the pieces.
        </p>
      )}

      {formError && <p className="text-xs font-sans text-brand-wine">{formError}</p>}

      <Button type="submit" loading={isSubmitting}>
        Submit return request
      </Button>
    </form>
  );
}
