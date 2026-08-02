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
          videos: { orderBy: { sortOrder: "asc" } },
          skus: { orderBy: [{ sortOrder: "asc" }, { size: "asc" }] },
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
    <div className="p-4 sm:p-8">
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
          tags: product.tags.join(", "),
          isVisible: product.isVisible,
          isFeatured: product.isFeatured,

          material: product.material ?? "",
          fabric: product.fabric ?? "",
          sleeve: product.sleeve ?? "",
          neck: product.neck ?? "",
          length: product.length ?? "",
          careInstr: product.careInstr ?? "",
          deliveryTime: product.deliveryTime ?? "",

          priceIncludesGst: product.priceIncludesGst,
          gstRate: product.gstRate == null ? "" : String(Number(product.gstRate)),
          gstExempt: product.gstExempt,
          hsnCode: product.hsnCode ?? "",

          skus: product.skus.map((sku) => ({
            tempId: sku.id,
            id: sku.id,
            size: sku.size,
            color: sku.color ?? "",
            price: String(Number(sku.price)),
            stock: String(sku.stock),
            skuCode: sku.skuCode,
            isActive: sku.isActive,
            lowStockAt: String(sku.lowStockAt),
          })),
          images: product.images.map((img) => ({
            tempId: img.id,
            id: img.id,
            url: img.url,
            altText: img.altText ?? "",
            kind: img.kind,
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
          })),
          videos: product.videos.map((video) => ({
            tempId: video.id,
            id: video.id,
            url: video.url,
            posterUrl: video.posterUrl ?? "",
            kind: video.kind,
            durationSec: video.durationSec == null ? "" : String(video.durationSec),
            sortOrder: video.sortOrder,
          })),
        }}
      />
    </div>
  );
}
