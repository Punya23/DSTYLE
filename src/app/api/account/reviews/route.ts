import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Tell us a little more — at least 10 characters.").max(2000),
});

/**
 * Create or replace the caller's review of a product.
 *
 * Only someone who actually received the piece may review it, so the write is
 * gated on a DELIVERED order of theirs containing that product. That delivered
 * order id is stored on the review as provenance for a "verified purchase" mark.
 */
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

  const deliveredItem = await prisma.orderItem.findFirst({
    where: {
      sku: { productId: data.productId },
      order: { userId, status: "DELIVERED" },
    },
    select: { orderId: true },
    orderBy: { id: "desc" },
  });

  if (!deliveredItem) {
    return NextResponse.json(
      { error: "You can review a piece once it has been delivered to you." },
      { status: 403 }
    );
  }

  const title = data.title?.trim() ? data.title.trim() : null;

  const review = await prisma.review.upsert({
    where: { userId_productId: { userId, productId: data.productId } },
    create: {
      userId,
      productId: data.productId,
      orderId: deliveredItem.orderId,
      rating: data.rating,
      title,
      body: data.body,
    },
    update: { rating: data.rating, title, body: data.body },
  });

  return NextResponse.json({ review }, { status: 201 });
}
