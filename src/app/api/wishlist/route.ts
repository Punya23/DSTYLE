import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productCardSelect, toProductCard } from "@/lib/product-select";

const bodySchema = z.object({ productId: z.string().min(1) });

/**
 * List the signed-in user's wishlist (empty when logged out).
 * `?detail=1` returns the full product cards for the wishlist page; the bare
 * form returns just IDs, which is all the heart toggles on a grid need.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      req.nextUrl.searchParams.get("detail") === "1" ? { products: [] } : { productIds: [] }
    );
  }

  if (req.nextUrl.searchParams.get("detail") === "1") {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id, product: { isVisible: true } },
      orderBy: { id: "desc" },
      select: { product: { select: productCardSelect } },
    });
    return NextResponse.json({ products: items.map((i) => toProductCard(i.product)) });
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });
  return NextResponse.json({ productIds: items.map((i) => i.productId) });
}

/** Add a product to the wishlist (idempotent). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  try {
    const { productId } = bodySchema.parse(await req.json());
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: session.user.id, productId } },
      update: {},
      create: { userId: session.user.id, productId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/** Remove a product from the wishlist. */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  try {
    const { productId } = bodySchema.parse(await req.json());
    await prisma.wishlistItem.deleteMany({
      where: { userId: session.user.id, productId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
