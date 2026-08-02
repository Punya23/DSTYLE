import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const schema = z
  .object({
    status: z
      .enum([
        "PENDING",
        "PAID",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ])
      .optional(),
    trackingNumber: z.string().trim().max(60).optional(),
    carrier: z.string().trim().max(60).optional(),
    /** Free-text line appended to the customer-visible tracking timeline. */
    note: z.string().trim().max(200).optional(),
    location: z.string().trim().max(120).optional(),
  })
  .refine(
    (body) =>
      Boolean(body.status) ||
      body.trackingNumber !== undefined ||
      body.carrier !== undefined ||
      Boolean(body.note),
    { message: "Nothing to update" }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await req.json());

    const existing = await prisma.order.findUnique({
      where: { id },
      select: {
        status: true,
        shippedAt: true,
        deliveredAt: true,
        cancelledAt: true,
        items: { select: { skuId: true, quantity: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data: Prisma.OrderUpdateInput = {};
    if (body.status) data.status = body.status;
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber || null;
    if (body.carrier !== undefined) data.carrier = body.carrier || null;

    // Stamp the milestone timestamps the customer-facing timeline reads from.
    // Set once only, so re-saving the same status doesn't rewrite history.
    if (body.status === "SHIPPED" && !existing.shippedAt) data.shippedAt = new Date();
    if (body.status === "DELIVERED" && !existing.deliveredAt) data.deliveredAt = new Date();
    if (body.status === "CANCELLED" && !existing.cancelledAt) data.cancelledAt = new Date();

    const statusChanged = Boolean(body.status && body.status !== existing.status);
    const note = body.note?.trim();

    // Stock was taken when the order was paid, so a cancellation or refund has
    // to give it back — otherwise inventory silently drains over time. Only
    // transitions *into* a dead state from a live one restock, so re-saving
    // CANCELLED on an already-cancelled order can't double-credit stock.
    const DEAD_STATES = ["CANCELLED", "REFUNDED"] as const;
    const STOCK_HELD = ["PAID", "PACKED", "SHIPPED", "DELIVERED"] as const;
    const shouldRestock =
      statusChanged &&
      DEAD_STATES.includes(body.status as (typeof DEAD_STATES)[number]) &&
      STOCK_HELD.includes(existing.status as (typeof STOCK_HELD)[number]);

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id }, data });

      if (shouldRestock) {
        for (const item of existing.items) {
          await tx.sKU.update({
            where: { id: item.skuId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // One timeline row per real transition, plus one for any standalone note
      // (e.g. "Held at the hub, delivery retried tomorrow").
      if (statusChanged || note) {
        await tx.orderEvent.create({
          data: {
            orderId: id,
            status: body.status ?? existing.status,
            message:
              note ||
              (shouldRestock ? "Stock returned to inventory." : null),
            location: body.location?.trim() || null,
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    console.error("Update order error:", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
