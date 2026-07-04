import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;
  let collections: Array<{ id: string; name: string }> = [];

  try {
    [product, collections] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          skus: { orderBy: [{ size: "asc" }] },
        },
      }),
      prisma.collection.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
  } catch {
    notFound();
  }

  if (!product) notFound();

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-[10px] font-sans tracking-luxe uppercase text-[#999] hover:text-brand-gold transition-colors mb-4"
        >
          <ChevronLeft size={12} /> Products
        </Link>
        <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">
          Edit Product
        </h1>
        <p className="text-[11px] font-sans text-[#888888] mt-1">{product.name}</p>
      </div>

      <ProductForm
        mode="edit"
        collections={collections}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          collectionId: product.collectionId ?? "",
          basePrice: String(Number(product.basePrice)),
          material: product.material ?? "",
          careInstr: product.careInstr ?? "",
          tags: product.tags.join(", "),
          isVisible: product.isVisible,
          isFeatured: product.isFeatured,
          skus: product.skus.map((sku) => ({
            tempId: sku.id,
            id: sku.id,
            size: sku.size,
            color: sku.color ?? "",
            price: String(Number(sku.price)),
            stock: String(sku.stock),
            skuCode: sku.skuCode,
          })),
          images: product.images.map((img) => ({
            tempId: img.id,
            id: img.id,
            url: img.url,
            altText: img.altText ?? "",
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
          })),
        }}
      />
    </div>
  );
}
