import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema, productScalars } from "@/lib/product-schema";
import { invalidate } from "@/lib/cache";

async function refreshStorefront() {
  revalidatePath("/");
  revalidatePath("/collections");
  // Product pages are prerendered on a 5-minute window (see `revalidate` in
  // `app/products/[slug]/page.tsx`). Passing "page" clears every slug under the
  // dynamic segment, which is what an edit to any one product needs — the piece
  // itself, plus the related-products rail on its collection siblings.
  revalidatePath("/products/[slug]", "page");
  // `revalidatePath` only clears this deployment's rendered pages. The shared
  // Redis copy of /api/products has to be dropped separately or the client-side
  // catalogue keeps serving the pre-edit rows for the rest of its TTL.
  await invalidate("products");
  await invalidate("collections");
}

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "STAFF";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Same omission as the collection GET in the sibling route — /api/admin/* is
  // outside the proxy matcher, so this is the only gate there is.
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        videos: { orderBy: { sortOrder: "asc" } },
        skus: { orderBy: [{ sortOrder: "asc" }, { size: "asc" }] },
        collection: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = productSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { ...productScalars(data), slug: data.slug },
      });

      // Upsert SKUs: update existing, create new ones
      for (const [i, sku] of data.skus.entries()) {
        const fields = {
          size: sku.size,
          color: sku.color ?? null,
          price: sku.price,
          stock: sku.stock,
          skuCode: sku.skuCode,
          isActive: sku.isActive,
          lowStockAt: sku.lowStockAt,
          sortOrder: sku.sortOrder || i,
        };
        if (sku.id) {
          await tx.sKU.update({ where: { id: sku.id }, data: fields });
        } else {
          await tx.sKU.create({ data: { productId: id, ...fields } });
        }
      }

      // Variants the admin removed from the form. A SKU that appears on a past
      // order can't be deleted without breaking that order's history, so it is
      // retired instead: zero stock and inactive, which the storefront already
      // treats as unbuyable.
      const keptIds = data.skus.map((s) => s.id).filter(Boolean) as string[];
      const removed = await tx.sKU.findMany({
        where: { productId: id, id: { notIn: keptIds } },
        select: { id: true, _count: { select: { orderItems: true } } },
      });
      for (const sku of removed) {
        if (sku._count.orderItems > 0) {
          await tx.sKU.update({
            where: { id: sku.id },
            data: { isActive: false, stock: 0 },
          });
        } else {
          await tx.sKU.delete({ where: { id: sku.id } });
        }
      }

      // Replace media (nothing references these rows, safe to recreate)
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, i) => ({
            productId: id,
            url: img.url,
            altText: img.altText ?? null,
            kind: img.kind,
            sortOrder: i,
            isPrimary: img.isPrimary,
          })),
        });
      }

      await tx.productVideo.deleteMany({ where: { productId: id } });
      if (data.videos.length > 0) {
        await tx.productVideo.createMany({
          data: data.videos.map((video, i) => ({
            productId: id,
            url: video.url,
            publicId: video.publicId ?? null,
            posterUrl: video.posterUrl ?? null,
            kind: video.kind,
            durationSec: video.durationSec ?? null,
            sortOrder: i,
          })),
        });
      }
    });

    await refreshStorefront();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", issues: err.issues }, { status: 400 });
    }
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "That SKU code is already used by another variant." },
        { status: 409 }
      );
    }
    console.error("Update product error:", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Soft delete: hide from store instead of hard delete to preserve order history
    await prisma.product.update({
      where: { id },
      data: { isVisible: false },
    });
    await refreshStorefront();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
