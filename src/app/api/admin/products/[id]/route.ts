import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function refreshStorefront() {
  revalidatePath("/");
  revalidatePath("/collections");
}

const skuSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1),
  color: z.string().optional().nullable(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  skuCode: z.string().min(1),
});

const imageSchema = z.object({
  url: z.string().min(1),
  altText: z.string().optional().nullable(),
  sortOrder: z.number().int(),
  isPrimary: z.boolean(),
});

const updateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  collectionId: z.string().optional().nullable(),
  basePrice: z.number().positive(),
  material: z.string().optional().nullable(),
  careInstr: z.string().optional().nullable(),
  tags: z.array(z.string()),
  isVisible: z.boolean(),
  isFeatured: z.boolean(),
  skus: z.array(skuSchema).min(1),
  images: z.array(imageSchema),
});

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "STAFF";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        skus: { orderBy: [{ size: "asc" }] },
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
    const data = updateSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          collectionId: data.collectionId ?? null,
          basePrice: data.basePrice,
          material: data.material ?? null,
          careInstr: data.careInstr ?? null,
          tags: data.tags,
          isVisible: data.isVisible,
          isFeatured: data.isFeatured,
        },
      });

      // Upsert SKUs: update existing, create new ones
      for (const sku of data.skus) {
        if (sku.id) {
          await tx.sKU.update({
            where: { id: sku.id },
            data: {
              size: sku.size,
              color: sku.color ?? null,
              price: sku.price,
              stock: sku.stock,
              skuCode: sku.skuCode,
            },
          });
        } else {
          await tx.sKU.create({
            data: {
              productId: id,
              size: sku.size,
              color: sku.color ?? null,
              price: sku.price,
              stock: sku.stock,
              skuCode: sku.skuCode,
            },
          });
        }
      }

      // Replace images (no order references, safe to recreate)
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, i) => ({
            productId: id,
            url: img.url,
            altText: img.altText ?? null,
            sortOrder: i,
            isPrimary: img.isPrimary,
          })),
        });
      }
    });

    refreshStorefront();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", issues: err.issues }, { status: 400 });
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
    refreshStorefront();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
