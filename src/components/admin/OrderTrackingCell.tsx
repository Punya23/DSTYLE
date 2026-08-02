"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Inline carrier + waybill editor. Saving PATCHes the order, which is also what
 * writes the customer-visible tracking number on their order page.
 */
export function OrderTrackingCell({
  orderId,
  carrier,
  trackingNumber,
}: {
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    carrier: carrier ?? "",
    trackingNumber: trackingNumber ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const dirty =
    values.carrier !== (carrier ?? "") || values.trackingNumber !== (trackingNumber ?? "");

  async function save() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setBusy(false);
    if (!res.ok) {
      setError(true);
      return;
    }
    router.refresh();
  }

  const inputClass =
    "w-[110px] border border-[#e0e0e0] px-2 py-1 text-[11px] font-sans focus:border-brand-gold focus:outline-none";

  return (
    <div className="flex flex-col gap-1">
      <input
        aria-label="Carrier"
        placeholder="Carrier"
        value={values.carrier}
        maxLength={60}
        onChange={(e) => setValues((v) => ({ ...v, carrier: e.target.value }))}
        className={inputClass}
      />
      <input
        aria-label="Tracking number"
        placeholder="AWB"
        value={values.trackingNumber}
        maxLength={60}
        onChange={(e) => setValues((v) => ({ ...v, trackingNumber: e.target.value }))}
        className={`${inputClass} font-mono`}
      />
      {dirty && (
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="self-start text-[10px] font-sans tracking-widest uppercase text-brand-gold hover:underline disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      )}
      {error && <span className="text-[10px] font-sans text-brand-wine">Failed</span>}
    </div>
  );
}
