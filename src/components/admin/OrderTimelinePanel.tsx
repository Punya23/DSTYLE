"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Circle, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORDER_STATUS_LABELS, formatDateTime } from "@/lib/account";
import type { OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

export interface TimelineRow {
  id: string;
  status: OrderStatus;
  message: string | null;
  location: string | null;
  createdAt: string;
}

/**
 * The order's audit trail plus the controls that append to it. Every status
 * change and every staff note writes one `OrderEvent`, so the customer-facing
 * tracking page and this panel read the same history.
 */
export function OrderTimelinePanel({
  orderId,
  status,
  trackingNumber,
  carrier,
  events,
}: {
  orderId: string;
  status: OrderStatus;
  trackingNumber: string | null;
  carrier: string | null;
  events: TimelineRow[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [courier, setCourier] = useState(carrier ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not update the order.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    if (await patch({ note, location: location || undefined })) {
      setNote("");
      setLocation("");
    }
  };

  const saveShipping = () =>
    patch({ trackingNumber: tracking.trim(), carrier: courier.trim() });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Timeline
        </h2>

        <div className="bg-white border border-[#e0e0e0] p-6">
          {events.length === 0 ? (
            <p className="text-[12px] font-sans text-[#888888]">
              No events yet. Changing the status or adding a note starts the trail.
            </p>
          ) : (
            <ol className="relative">
              {events.map((event, i) => {
                const latest = i === 0;
                return (
                  <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Connector, drawn behind the marker for all but the last row. */}
                    {i < events.length - 1 && (
                      <span className="absolute left-[7px] top-5 bottom-0 w-px bg-[#e8e8e8]" />
                    )}
                    <span
                      className={cn(
                        "relative z-10 shrink-0 mt-0.5",
                        latest ? "text-brand-gold-deep" : "text-[#c9c4bd]"
                      )}
                    >
                      {latest ? <CircleDot size={15} /> : <Circle size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-[12px] font-sans font-medium text-black">
                          {ORDER_STATUS_LABELS[event.status]}
                        </span>
                        <span className="text-[11px] font-sans text-[#888888]">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      {event.message && (
                        <p className="text-[12px] font-sans text-[#6b6560] mt-1 leading-relaxed">
                          {event.message}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-[11px] font-sans text-[#888888] mt-0.5">
                          {event.location}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Add an update
        </h2>
        <div className="bg-white border border-[#e0e0e0] p-6 space-y-4">
          <Input
            label="Note (visible to the customer)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Held at the Mumbai hub, delivery retried tomorrow"
            maxLength={200}
          />
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Mumbai"
            maxLength={120}
          />
          <Button size="sm" onClick={addNote} loading={saving} disabled={!note.trim()}>
            Add to timeline
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Shipment
        </h2>
        <div className="bg-white border border-[#e0e0e0] p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Courier"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              placeholder="Blue Dart"
            />
            <Input
              label="Tracking / AWB number"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="1234567890"
            />
          </div>
          <Button size="sm" variant="outline" onClick={saveShipping} loading={saving}>
            Save shipment details
          </Button>
          {status === "PENDING" && (
            <p className="text-[11px] font-sans text-[#888888]">
              This order hasn&apos;t been paid yet — stock is only reserved once payment lands.
            </p>
          )}
        </div>
      </section>

      {error && (
        <p className="text-[12px] font-sans text-brand-wine bg-brand-wine/5 border border-brand-wine/20 px-4 py-3">
          {error}
        </p>
      )}
    </div>
  );
}
