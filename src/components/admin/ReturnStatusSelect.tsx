"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReturnStatus } from "@/generated/prisma/client";
import { RETURN_STATUS_LABELS } from "@/lib/account";

const ALL_STATUSES: ReturnStatus[] = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKED_UP",
  "RECEIVED",
  "REFUNDED",
  "CANCELLED",
];

const STATUS_COLORS: Record<ReturnStatus, string> = {
  REQUESTED: "text-yellow-700 bg-yellow-50",
  APPROVED: "text-blue-700 bg-blue-50",
  REJECTED: "text-red-700 bg-red-50",
  PICKED_UP: "text-purple-700 bg-purple-50",
  RECEIVED: "text-green-700 bg-green-50",
  REFUNDED: "text-[#888888] bg-[#f5f5f5]",
  CANCELLED: "text-red-700 bg-red-50",
};

/**
 * Staff control for a return. Marking it REFUNDED also flips the order to
 * REFUNDED server-side, so the customer's order history stays truthful.
 */
export function ReturnStatusSelect({
  returnId,
  currentStatus,
  suggestedRefund,
}: {
  returnId: string;
  currentStatus: ReturnStatus;
  suggestedRefund: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const change = (next: ReturnStatus) => {
    setStatus(next);
    setError(false);
    startTransition(async () => {
      const res = await fetch(`/api/admin/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          ...(next === "REFUNDED" ? { refundAmount: suggestedRefund } : {}),
        }),
      });
      if (!res.ok) {
        setError(true);
        setStatus(currentStatus);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => change(e.target.value as ReturnStatus)}
        disabled={isPending}
        className={`cursor-pointer border-0 px-2 py-1 text-[10px] font-sans font-medium tracking-widest uppercase transition-colors focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-60 ${STATUS_COLORS[status]}`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {RETURN_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <span className="text-[10px] font-sans text-red-600">Failed</span>}
    </div>
  );
}
