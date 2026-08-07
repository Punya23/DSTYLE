import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { cached, TTL } from "@/lib/cache";

/**
 * Query bounds matter here, not just shape. The previous `parseInt` had no
 * floor or ceiling, so `?limit=100000` pulled the whole catalogue with images
 * and SKUs in a single query, `?page=-5` produced a negative `skip` that Prisma
 * rejects with a 500, and `?limit=abc` produced `NaN`.
 */
const querySchema = z.object({
  collection: z.string().trim().min(1).max(80).optional(),
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, "read");
  if (limited) return limited;

  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query parameters" },
      { status: 400 }
    );
  }

  const { collection, featured, limit, page } = parsed.data;
  const skip = (page - 1) * limit;

  // One object, used by both the page query and the count, so the two can never
  // disagree about what is being paginated.
  const where = {
    isVisible: true,
    ...(collection ? { collection: { slug: collection } } : {}),
    ...(featured ? { isFeatured: true } : {}),
  };

  // The bounded schema above is what makes this cacheable: the key space is
  // finite, so an attacker can't fill Redis by varying the query string.
  const cacheKey = `${collection ?? "all"}:${featured ? "featured" : "any"}:${page}:${limit}`;

  try {
    const { products, total } = await cached("products", cacheKey, TTL.products, async () => {
      const [rows, count] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 2 },
            skus: true,
            collection: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);
      return { products: rows, total: count };
    });

    return NextResponse.json({ products, total, page, limit });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
