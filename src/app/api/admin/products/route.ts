import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const skuSchema = z.object({
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

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  collectionId: z.string().optional().nullable(),
  basePrice: z.number().positive(),
  material: z.string().optional().nullable(),
  careInstr: z.string().optional().nullable(),
  tags: z.array(z.string()),
  isVisible: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  skus: z.array(skuSchema).min(1),
  images: z.array(imageSchema),
});

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
        name: data.name,
        slug,
        description: data.description,
        collectionId: data.collectionId ?? null,
        basePrice: data.basePrice,
        material: data.material ?? null,
        careInstr: data.careInstr ?? null,
        tags: data.tags,
        isVisible: data.isVisible,
        isFeatured: data.isFeatured,
        skus: {
          create: data.skus.map((sku) => ({
            size: sku.size,
            color: sku.color ?? null,
            price: sku.price,
            stock: sku.stock,
            skuCode: sku.skuCode,
          })),
        },
        images: {
          create: data.images.map((img) => ({
            url: img.url,
            altText: img.altText ?? null,
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
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
