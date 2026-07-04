import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  let collections: Array<{ id: string; name: string }> = [];
  try {
    collections = await prisma.collection.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch {
    // DB not available
  }

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
          New Product
        </h1>
        <p className="text-[11px] font-sans text-[#888888] mt-1">
          Fill in the details below. Images are uploaded immediately on selection.
        </p>
      </div>

      <ProductForm
        mode="create"
        collections={collections}
        initial={{
          name: "",
          slug: "",
          description: "",
          collectionId: "",
          basePrice: "",
          material: "",
          careInstr: "",
          tags: "",
          isVisible: true,
          isFeatured: false,
          skus: [],
          images: [],
        }}
      />
    </div>
  );
}
