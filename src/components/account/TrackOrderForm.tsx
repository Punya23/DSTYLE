"use client";

import { useState } from "react";
import type { OrderStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { ORDER_STATUS_VARIANT, formatDate, type TimelineStep } from "@/lib/account";

interface TrackedOrder {
  reference: string;
  status: OrderStatus;
  statusLabel: string;
  placedAt: string;
  itemCount: number;
  carrier: string | null;
  trackingNumber: string | null;
  timeline: (Omit<TimelineStep, "at"> & { at: string | null })[];
}

/**
 * Reference + email lookup against /api/orders/track. Works signed out, which
 * is the point — the email is what proves the order is yours.
 */
export function TrackOrderForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);

    const res = await fetch("/api/orders/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, email }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Could not look up that order.");
      return;
    }

    setOrder(json.order as TrackedOrder);
  }

  const steps: TimelineStep[] =
    order?.timeline.map((step) => ({ ...step, at: step.at ? new Date(step.at) : null })) ?? [];

  return (
    <div className="space-y-8">
      <form
        onSubmit={submit}
        className="max-w-md space-y-4 border border-brand-ivory-deep bg-white p-6"
      >
        <Input
          id="track-reference"
          label="Order reference"
          placeholder="#4F2A9C10"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
        />
        <Input
          id="track-email"
          label="Email on the order"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}

        <Button type="submit" size="sm" loading={busy}>
          Track order
        </Button>
      </form>

      {order && (
        <div className="border border-brand-ivory-deep bg-white p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[12px] text-black">{order.reference}</p>
              <p className="mt-0.5 text-[11px] font-sans text-[#888888]">
                Placed {formatDate(order.placedAt)} · {order.itemCount} item
                {order.itemCount === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{order.statusLabel}</Badge>
          </div>

          {order.trackingNumber && (
            <div className="mb-6 border border-brand-ivory-deep bg-brand-ivory p-4">
              <p className="text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
                {order.carrier ?? "Courier"} · Tracking number
              </p>
              <p className="mt-1 font-mono text-[13px] text-black">{order.trackingNumber}</p>
            </div>
          )}

          <OrderTimeline steps={steps} />
        </div>
      )}
    </div>
  );
}
