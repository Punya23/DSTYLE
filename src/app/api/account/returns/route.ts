import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isReturnEligible } from "@/lib/account";
import { returnRequestSchema as bodySchema } from "@/lib/account-schemas";

/** Raise a return request for part or all of a delivered order. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let data;
  try {
    data = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const userId = session.user.id;

  const order = await prisma.order.findFirst({
    where: { id: data.orderId, userId },
    include: { items: true, returns: { select: { id: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (!isReturnEligible(order, order.returns.length > 0)) {
    return NextResponse.json(
      {
        error:
          order.returns.length > 0
            ? "This order already has a return request."
            : "This order is outside the return window.",
      },
      { status: 409 }
    );
  }

  // Every line must belong to this order, and you can't return more than you
  // bought — both are checked server-side; the form is only a convenience.
  const byId = new Map(order.items.map((item) => [item.id, item]));
  for (const line of data.items) {
    const item = byId.get(line.orderItemId);
    if (!item) {
      return NextResponse.json({ error: "That item isn't part of this order." }, { status: 400 });
    }
    if (line.quantity > item.quantity) {
      return NextResponse.json(
        { error: "You can't return more units than you ordered." },
        { status: 400 }
      );
    }
  }

  const request = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      userId,
      reason: data.reason,
      comment: data.comment?.trim() ? data.comment.trim() : null,
      items: {
        create: data.items.map((line) => ({
          orderItemId: line.orderItemId,
          quantity: line.quantity,
        })),
      },
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ request }, { status: 201 });
}
