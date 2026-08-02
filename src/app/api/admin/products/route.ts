import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { productSchema, productScalars } from "@/lib/product-schema";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "STAFF";
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        skus: true,
        collection: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = productSchema.parse(body);

    // Guarantee a unique slug — auto-suffix (-2, -3, …) if the name collides
    // with an existing product, so reusing a name never fails.
    const baseSlug = data.slug || slugify(data.name) || "product";
    let slug = baseSlug;
    let attempt = 1;
    while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const product = await prisma.product.create({
      data: {
        ...productScalars(data),
        slug,
        skus: {
          create: data.skus.map((sku, i) => ({
            size: sku.size,
            color: sku.color ?? null,
            price: sku.price,
            stock: sku.stock,
            skuCode: sku.skuCode,
            isActive: sku.isActive,
            lowStockAt: sku.lowStockAt,
            sortOrder: sku.sortOrder || i,
          })),
        },
        images: {
          create: data.images.map((img, i) => ({
            url: img.url,
            altText: img.altText ?? null,
            kind: img.kind,
            sortOrder: img.sortOrder ?? i,
            isPrimary: img.isPrimary,
          })),
        },
        videos: {
          create: data.videos.map((video, i) => ({
            url: video.url,
            publicId: video.publicId ?? null,
            posterUrl: video.posterUrl ?? null,
            kind: video.kind,
            durationSec: video.durationSec ?? null,
            sortOrder: video.sortOrder ?? i,
          })),
        },
      },
    });

    // Refresh the storefront so the new product appears immediately.
    revalidatePath("/");
    revalidatePath("/collections");

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", issues: err.issues }, { status: 400 });
    }
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "A product with one of these SKU codes already exists. Give each size a unique SKU code and try again." },
        { status: 409 }
      );
    }
    console.error("Create product error:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
