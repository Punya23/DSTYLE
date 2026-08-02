import type { OrderStatus, ReturnStatus } from "@/generated/prisma/client";

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export type BadgeVariant = "default" | "sand" | "outline" | "red";

export const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  PENDING: "sand",
  PAID: "default",
  PACKED: "default",
  SHIPPED: "sand",
  DELIVERED: "outline",
  CANCELLED: "red",
  REFUNDED: "red",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PICKED_UP: "Picked up",
  RECEIVED: "Received",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export const RETURN_STATUS_VARIANT: Record<ReturnStatus, BadgeVariant> = {
  REQUESTED: "sand",
  APPROVED: "default",
  REJECTED: "red",
  PICKED_UP: "sand",
  RECEIVED: "default",
  REFUNDED: "outline",
  CANCELLED: "red",
};

/** Reasons offered on the return form. Stored verbatim on the request. */
export const RETURN_REASONS = [
  "Size or fit issue",
  "Not as described",
  "Damaged or defective",
  "Wrong item delivered",
  "Changed my mind",
  "Other",
] as const;

/* -------------------------------------------------------------------------- */
/* Invoices                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Human-facing invoice number, derived purely from the order so it is stable
 * without a counter table (and therefore free of sequence-gap races):
 * `DS-2026-4F2A9C10`.
 */
export function invoiceNumber(order: { id: string; createdAt: Date | string }): string {
  const year = new Date(order.createdAt).getFullYear();
  return `DS-${year}-${order.id.slice(-8).toUpperCase()}`;
}

/** Short order reference used across the account UI: `#4F2A9C10`. */
export function orderRef(orderId: string): string {
  return `#${orderId.slice(-8).toUpperCase()}`;
}

/** Statuses for which an invoice exists — unpaid orders have nothing to bill. */
export const INVOICEABLE_STATUSES: OrderStatus[] = [
  "PAID",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "REFUNDED",
];

export function hasInvoice(status: OrderStatus): boolean {
  return INVOICEABLE_STATUSES.includes(status);
}

/* -------------------------------------------------------------------------- */
/* Returns                                                                    */
/* -------------------------------------------------------------------------- */

/** Days after delivery during which a return can still be raised. */
export const RETURN_WINDOW_DAYS = 7;

export function returnWindowClosesAt(order: {
  deliveredAt: Date | string | null;
  updatedAt: Date | string;
}): Date | null {
  const delivered = order.deliveredAt ?? null;
  // Orders delivered before tracking timestamps existed fall back to the last
  // status change, which is when the DELIVERED transition was written.
  const base = delivered ? new Date(delivered) : new Date(order.updatedAt);
  if (Number.isNaN(base.getTime())) return null;
  return new Date(base.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * A return can be raised only on a delivered order, inside the window, and
 * only once — an existing open/settled request blocks a second one.
 */
export function isReturnEligible(
  order: {
    status: OrderStatus;
    deliveredAt: Date | string | null;
    updatedAt: Date | string;
  },
  hasExistingReturn: boolean,
  now: Date = new Date()
): boolean {
  if (order.status !== "DELIVERED" || hasExistingReturn) return false;
  const closes = returnWindowClosesAt(order);
  return closes !== null && now.getTime() <= closes.getTime();
}

/** Return states the customer may still cancel themselves. */
export function isReturnCancellable(status: ReturnStatus): boolean {
  return status === "REQUESTED" || status === "APPROVED";
}

/* -------------------------------------------------------------------------- */
/* Tracking timeline                                                          */
/* -------------------------------------------------------------------------- */

/** The happy-path progression rendered as a stepper on the tracking page. */
export const TRACKING_STEPS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
];

const STEP_COPY: Record<OrderStatus, string> = {
  PENDING: "Order placed — awaiting payment confirmation.",
  PAID: "Payment received. Your order is confirmed.",
  PACKED: "Your pieces are packed and ready to dispatch.",
  SHIPPED: "Handed to the courier and on its way.",
  DELIVERED: "Delivered. We hope you love it.",
  CANCELLED: "This order was cancelled.",
  REFUNDED: "This order was refunded.",
};

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  description: string;
  at: Date | null;
  reached: boolean;
  current: boolean;
}

export interface TimelineOrder {
  status: OrderStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  shippedAt: Date | string | null;
  deliveredAt: Date | string | null;
  cancelledAt: Date | string | null;
}

export interface TimelineEvent {
  status: OrderStatus;
  createdAt: Date | string;
  message: string | null;
  location: string | null;
}

/**
 * Build the tracking stepper. Real `OrderEvent` rows supply the timestamps when
 * they exist; orders created before event logging fall back to the order's own
 * columns so historic orders still render a sensible timeline.
 *
 * Terminal off-path states (CANCELLED / REFUNDED) replace the tail of the
 * stepper rather than extending it — an order that never shipped should not
 * show "Shipped" as pending forever.
 */
export function buildTimeline(order: TimelineOrder, events: TimelineEvent[] = []): TimelineStep[] {
  const firstEventAt = new Map<OrderStatus, Date>();
  for (const event of events) {
    const at = new Date(event.createdAt);
    if (!firstEventAt.has(event.status)) firstEventAt.set(event.status, at);
  }

  const fallback: Partial<Record<OrderStatus, Date | null>> = {
    PENDING: new Date(order.createdAt),
    SHIPPED: order.shippedAt ? new Date(order.shippedAt) : null,
    DELIVERED: order.deliveredAt ? new Date(order.deliveredAt) : null,
    CANCELLED: order.cancelledAt ? new Date(order.cancelledAt) : null,
  };

  const terminal = order.status === "CANCELLED" || order.status === "REFUNDED";
  const currentIndex = TRACKING_STEPS.indexOf(order.status);

  const steps: TimelineStep[] = TRACKING_STEPS.map((status, index) => {
    const reached = terminal
      ? // On a terminal order, only stages it demonstrably passed through count.
        firstEventAt.has(status) || Boolean(fallback[status]) || status === "PENDING"
      : currentIndex >= 0 && index <= currentIndex;

    return {
      status,
      label: ORDER_STATUS_LABELS[status],
      description: STEP_COPY[status],
      at: firstEventAt.get(status) ?? fallback[status] ?? null,
      reached,
      current: !terminal && index === currentIndex,
    };
  });

  if (terminal) {
    steps.push({
      status: order.status,
      label: ORDER_STATUS_LABELS[order.status],
      description: STEP_COPY[order.status],
      at:
        firstEventAt.get(order.status) ??
        fallback[order.status] ??
        new Date(order.updatedAt),
      reached: true,
      current: true,
    });
  }

  return steps;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
