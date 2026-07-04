"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/types";

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "text-yellow-700 bg-yellow-50",
  CONFIRMED: "text-green-700 bg-green-50",
  PROCESSING: "text-blue-700 bg-blue-50",
  SHIPPED: "text-purple-700 bg-purple-50",
  DELIVERED: "text-[#888888] bg-[#f5f5f5]",
  CANCELLED: "text-red-700 bg-red-50",
  RETURNED: "text-red-700 bg-red-50",
};

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleChange = async (newStatus: OrderStatus) => {
    setStatus(newStatus);
    startTransition(async () => {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        disabled={isPending}
        className={`text-[10px] font-sans font-medium tracking-widest uppercase border-0 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-colors disabled:opacity-60 ${
          STATUS_COLORS[status]
        }`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {saved && (
        <span className="text-[10px] font-sans text-green-600">✓</span>
      )}
    </div>
  );
}
