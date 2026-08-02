import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * "Save for later" — parked cart lines. Unlike the wishlist (product-level,
 * no size) this remembers the exact variant and quantity, so moving an item
 * back into the bag is lossless.
 *
 * Signed-in only: a guest's parked items live in the same localStorage cart
 * the rest of their bag does.
 */

const bodySchema = z.object({
  skuId: z.string().min(1),
  quantity: z.number().int().positive().max(99).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  // Everything the cart needs to render a parked line without a second call.
  const rows = await prisma.savedItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      quantity: true,
      createdAt: true,
      sku: {
        select: {
          id: true,
          size: true,
          color: true,
          stock: true,
          isActive: true,
          price: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      skuId: row.sku.id,
      quantity: row.quantity,
      productId: row.sku.product.id,
      productName: row.sku.product.name,
      productSlug: row.sku.product.slug,
      image: row.sku.product.images[0]?.url ?? "",
      size: row.sku.size,
      color: row.sku.color,
      price: Number(row.sku.price),
      stock: row.sku.isActive ? row.sku.stock : 0,
    })),
  });
}

/** Park an item. Re-saving the same variant just updates its quantity. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to save items." }, { status: 401 });
  }

  try {
    const { skuId, quantity = 1 } = bodySchema.parse(await req.json());
    await prisma.savedItem.upsert({
      where: { userId_skuId: { userId: session.user.id, skuId } },
      update: { quantity },
      create: { userId: session.user.id, skuId, quantity },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const { skuId } = bodySchema.parse(await req.json());
    await prisma.savedItem.deleteMany({ where: { userId: session.user.id, skuId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
