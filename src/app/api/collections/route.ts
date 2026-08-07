import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cached, TTL } from "@/lib/cache";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * The collection list is the single most-requested piece of data in the app —
 * the nav, the mega-menu and every collection page ask for it — and it changes
 * a handful of times a year. Straight into the cache.
 */
export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "read");
  if (limited) return limited;

  try {
    const collections = await cached("collections", "visible", TTL.collections, () =>
      prisma.collection.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } },
      })
    );
    return NextResponse.json({ collections });
  } catch (err) {
    console.error("GET /api/collections error:", err);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}
