import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const schema = z.object({
  status: z.enum([
    "REQUESTED",
    "APPROVED",
    "REJECTED",
    "PICKED_UP",
    "RECEIVED",
    "REFUNDED",
    "CANCELLED",
  ]),
  refundAmount: z.number().nonnegative().optional(),
});

/** Staff-side progression of a return request. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await req.json());

    const data: Prisma.ReturnRequestUpdateInput = { status: body.status };
    if (body.refundAmount !== undefined) data.refundAmount = body.refundAmount;

    // REFUNDED / REJECTED / CANCELLED are end states — stamp when we got there.
    if (["REFUNDED", "REJECTED", "CANCELLED"].includes(body.status)) {
      data.resolvedAt = new Date();
    }

    const request = await prisma.$transaction(async (tx) => {
      // Guarded transition: only a return that is NOT already REFUNDED can move
      // into REFUNDED, so a double-click (or a retried request) can never
      // restock the same units twice.
      const transitioned = await tx.returnRequest.updateMany({
        where: body.status === "REFUNDED" ? { id, status: { not: "REFUNDED" } } : { id },
        data,
      });

      const updated = await tx.returnRequest.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { orderItem: true } } },
      });

      if (body.status !== "REFUNDED" || transitioned.count !== 1) return updated;

      // Returned goods come back into sellable stock. The admin orders route
      // only restocks on its own status transitions, and it can never fire for
      // an order that has already reached a refunded end state — so this is the
      // only place returned inventory gets credited back.
      for (const item of updated.items) {
        await tx.sKU.update({
          where: { id: item.orderItem.skuId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Returns are per-line, so a refund only ends the ORDER when every unit
      // on it has been returned across all refunded returns. A partial refund
      // leaves the order status alone and just records the event — otherwise
      // one returned item would wipe the whole order out of revenue reporting.
      const order = await tx.order.findUniqueOrThrow({
        where: { id: updated.orderId },
        select: { status: true },
      });
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: updated.orderId },
        select: { id: true, quantity: true },
      });
      const returnedByItem = new Map<string, number>();
      const refundedReturns = await tx.returnRequest.findMany({
        where: { orderId: updated.orderId, status: "REFUNDED" },
        include: { items: true },
      });
      for (const ret of refundedReturns) {
        for (const item of ret.items) {
          returnedByItem.set(
            item.orderItemId,
            (returnedByItem.get(item.orderItemId) ?? 0) + item.quantity
          );
        }
      }
      const fullyReturned = orderItems.every(
        (oi) => (returnedByItem.get(oi.id) ?? 0) >= oi.quantity
      );

      if (fullyReturned) {
        await tx.order.update({
          where: { id: updated.orderId },
          data: { status: "REFUNDED" },
        });
      }
      await tx.orderEvent.create({
        data: {
          orderId: updated.orderId,
          // A partial refund doesn't move the order, so the timeline row keeps
          // the order's current status and carries the note instead.
          status: fullyReturned ? "REFUNDED" : order.status,
          message: fullyReturned
            ? "Return received and refunded."
            : "Partial return received and refunded. Remaining items unaffected.",
        },
      });

      return updated;
    });

    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    console.error("Update return error:", err);
    return NextResponse.json({ error: "Failed to update return" }, { status: 500 });
  }
}
