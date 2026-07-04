import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection");
  const featured = searchParams.get("featured") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const page = parseInt(searchParams.get("page") ?? "1");
  const skip = (page - 1) * limit;

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          isVisible: true,
          ...(collection ? { collection: { slug: collection } } : {}),
          ...(featured ? { isFeatured: true } : {}),
        },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 2 },
          skus: true,
          collection: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({
        where: {
          isVisible: true,
          ...(collection ? { collection: { slug: collection } } : {}),
          ...(featured ? { isFeatured: true } : {}),
        },
      }),
    ]);

    return NextResponse.json({ products, total, page, limit });
  } catch (err) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
