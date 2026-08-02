import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productCardSelect, toProductCard } from "@/lib/product-select";
import { MAX_RECENTLY_VIEWED } from "@/lib/recently-viewed";


const bodySchema = z.object({
  productId: z.string().min(1).optional(),
  /** Guest history handed over on first sign-in, most-recent-first. */
  productIds: z.array(z.string().min(1)).max(MAX_RECENTLY_VIEWED).optional(),
});

/**
 * Recently viewed products, newest first.
 *
 * Signed in  → read from the user's server-side history.
 * Guest      → the client passes its localStorage IDs as `?ids=a,b,c` and gets
 *              the same product payload back, in the order it asked for.
 */
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  const session = await auth();

  if (!session?.user?.id) {
    const ids = (idsParam ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENTLY_VIEWED);
    if (ids.length === 0) return NextResponse.json({ products: [] });

    const found = await prisma.product.findMany({
      where: { id: { in: ids }, isVisible: true },
      select: productCardSelect,
    });
    // `findMany` returns rows in database order — reorder to the caller's list
    // so the strip reads newest-first like the guest actually browsed.
    const byId = new Map(found.map((p) => [p.id, p]));
    return NextResponse.json({
      products: ids.flatMap((id) => {
        const p = byId.get(id);
        return p ? [toProductCard(p)] : [];
      }),
    });
  }

  const rows = await prisma.recentlyViewed.findMany({
    where: { userId: session.user.id, product: { isVisible: true } },
    orderBy: { viewedAt: "desc" },
    take: MAX_RECENTLY_VIEWED,
    select: { product: { select: productCardSelect } },
  });

  return NextResponse.json({ products: rows.map((r) => toProductCard(r.product)) });
}

/**
 * Record a view. Accepts either a single `productId` (a page view) or a
 * `productIds` list (a guest's localStorage history being merged in at
 * sign-in). No-ops when logged out — guests keep their history client-side.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: true, stored: false });

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = session.user.id;
  // Merge lists arrive newest-first; write them oldest-first so the resulting
  // `viewedAt` order matches the order the guest actually browsed in.
  const ids = parsed.productId ? [parsed.productId] : [...(parsed.productIds ?? [])].reverse();
  if (ids.length === 0) return NextResponse.json({ ok: true, stored: false });

  // Only accept IDs that exist — the client supplies these, and a bad one
  // would otherwise fail the whole write on the foreign key.
  const valid = await prisma.product.findMany({
    where: { id: { in: ids }, isVisible: true },
    select: { id: true },
  });
  const validIds = new Set(valid.map((p) => p.id));

  const now = Date.now();
  await prisma.$transaction(
    ids
      .filter((id) => validIds.has(id))
      .map((id, i) =>
        prisma.recentlyViewed.upsert({
          where: { userId_productId: { userId, productId: id } },
          // Spread the timestamps a millisecond apart so a merged batch keeps
          // its relative order instead of collapsing into one instant.
          update: { viewedAt: new Date(now + i) },
          create: { userId, productId: id, viewedAt: new Date(now + i) },
        })
      )
  );

  // Trim the tail so the table can't grow without bound per user.
  const overflow = await prisma.recentlyViewed.findMany({
    where: { userId },
    orderBy: { viewedAt: "desc" },
    skip: MAX_RECENTLY_VIEWED,
    select: { id: true },
  });
  if (overflow.length > 0) {
    await prisma.recentlyViewed.deleteMany({
      where: { id: { in: overflow.map((r) => r.id) } },
    });
  }

  return NextResponse.json({ ok: true, stored: true });
}

/** Clear the whole history. */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  await prisma.recentlyViewed.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
