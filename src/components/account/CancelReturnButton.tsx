"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Withdraw a return request that staff haven't collected yet. */
export function CancelReturnButton({ returnId }: { returnId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function cancel() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/account/returns/${returnId}`, { method: "PATCH" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Could not cancel this return.");
      return;
    }

    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] transition-colors hover:text-brand-wine"
        >
          Cancel return
        </button>
        {error && <p className="mt-1 text-xs font-sans text-brand-wine">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-sans text-[#666666]">Withdraw this request?</span>
      <button
        type="button"
        disabled={busy}
        onClick={cancel}
        className="text-[10px] font-sans tracking-luxe uppercase text-brand-wine hover:underline disabled:opacity-40"
      >
        Yes, cancel
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] hover:underline"
      >
        Keep it
      </button>
    </div>
  );
}
