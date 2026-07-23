import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany<{
  include: {
    images: { take: 1; orderBy: { sortOrder: "asc" } };
    skus: true;
    collection: { select: { name: true } };
    _count: { select: { skus: true } };
  };
}>>>[number];

async function getProducts(): Promise<ProductRow[]> {
  try {
    return await prisma.product.findMany({
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        skus: true,
        collection: { select: { name: true } },
        _count: { select: { skus: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">Catalogue</p>
          <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">Products</h1>
        </div>
        <Link href="/admin/products/new">
          <Button size="sm">
            <Plus size={14} className="mr-1" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-[#e0e0e0] overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-[#e0e0e0]">
            <tr>
              {["Product", "Collection", "Price", "Variants", "Status", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[10px] font-sans font-medium tracking-widest uppercase text-[#888888]"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[12px] font-sans text-[#888888]"
                >
                  No products yet.{" "}
                  <Link href="/admin/products/new" className="underline text-black">
                    Add your first product.
                  </Link>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const totalStock = product.skus.reduce(
                  (s, sku) => s + sku.stock,
                  0
                );
                return (
                  <tr
                    key={product.id}
                    className="border-b border-[#f5f5f5] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-sans font-medium text-black">
                        {product.name}
                      </p>
                      <p className="text-[11px] font-sans text-[#888888]">
                        {product.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-sans text-[#888888]">
                      {product.collection?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-sans text-black">
                      {formatPrice(Number(product.basePrice))}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-sans text-black">
                      {product._count.skus} SKUs · {totalStock} units
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={product.isVisible ? "default" : "outline"}
                      >
                        {product.isVisible ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${product.id}`}>
                        <button className="p-1.5 text-[#888888] hover:text-black transition-colors">
                          <Pencil size={14} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
