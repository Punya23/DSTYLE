import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ collections });
  } catch (err) {
    console.error("GET /api/collections error:", err);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}
