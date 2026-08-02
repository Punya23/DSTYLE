"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RETURN_REASONS } from "@/lib/account";
import { formatPrice } from "@/lib/utils";

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
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(item: ReturnableItem) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item.quantity;
      return next;
    });
  }

  function setQuantity(item: ReturnableItem, quantity: number) {
    setSelected((prev) => ({ ...prev, [item.id]: Math.min(Math.max(quantity, 1), item.quantity) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const lines = Object.entries(selected).map(([orderItemId, quantity]) => ({
      orderItemId,
      quantity,
    }));

    if (lines.length === 0) {
      setError("Select at least one item to return.");
      return;
    }

    setBusy(true);
    setError(null);

    const res = await fetch("/api/account/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, reason, comment, items: lines }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "Could not raise this return.");
      setBusy(false);
      return;
    }

    router.push("/account/returns");
    router.refresh();
  }

  const refundEstimate = items
    .filter((item) => selected[item.id])
    .reduce((sum, item) => sum + (item.lineTotal / item.quantity) * selected[item.id], 0);

  return (
    <form onSubmit={submit} className="space-y-8">
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
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
                name="return-reason"
                value={option}
                checked={reason === option}
                onChange={() => setReason(option)}
                className="accent-brand-gold"
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
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-brand-ivory-deep bg-white px-4 py-3 text-sm font-sans text-brand-ink placeholder:text-[#a89f92] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
          />
        </div>
      </section>

      {refundEstimate > 0 && (
        <p className="text-[12px] font-sans text-[#666666]">
          Estimated refund{" "}
          <span className="font-medium text-black">{formatPrice(refundEstimate)}</span> — confirmed
          once we receive and inspect the pieces.
        </p>
      )}

      {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}

      <Button type="submit" loading={busy}>
        Submit return request
      </Button>
    </form>
  );
}
