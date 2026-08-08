import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS, buildTimeline, orderRef } from "@/lib/account";
import { enforceRateLimit } from "@/lib/rate-limit";
import { trackOrderSchema as bodySchema } from "@/lib/account-schemas";

/**
 * Guest order tracking. Knowing an order reference isn't enough — the email on
 * the account must match too, so a guessed reference reveals nothing. The
 * response carries only shipping progress: no addresses, no payment ids.
 */
export async function POST(req: NextRequest) {
  // Unauthenticated reference+email lookup — cap it so the pair can't be ground out.
  const limited = await enforceRateLimit(req, "authWrite");
  if (limited) return limited;

  let data;
  try {
    data = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const reference = data.reference.replace(/^#/, "").trim().toUpperCase();
  const email = data.email.toLowerCase();

  // The reference shown to customers is the tail of the order id, so match on
  // the id ending rather than the whole thing (a full id also works).
  const order = await prisma.order.findFirst({
    where: {
      user: { email },
      OR: [{ id: reference.toLowerCase() }, { id: { endsWith: reference.toLowerCase() } }],
    },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      items: { select: { quantity: true } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "We couldn't find an order with that reference and email." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    order: {
      reference: orderRef(order.id),
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status],
      placedAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      timeline: buildTimeline(order, order.events).map((step) => ({
        status: step.status,
        label: step.label,
        description: step.description,
        at: step.at,
        reached: step.reached,
        current: step.current,
      })),
    },
  });
}
