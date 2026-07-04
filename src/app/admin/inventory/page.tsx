import type { SKU } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/admin/InventoryTable";

type SkuWithProduct = SKU & { product: { id: string; name: string; slug: string } };

async function getInventory(): Promise<SkuWithProduct[]> {
  try {
    return await prisma.sKU.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ product: { name: "asc" } }, { size: "asc" }],
    });
  } catch {
    return [];
  }
}

export default async function AdminInventoryPage() {
  const skus = await getInventory();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">Stock</p>
          <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">
            Inventory
          </h1>
          <p className="text-[11px] font-sans text-[#888888] mt-1">
            {skus.filter((s) => s.stock === 0).length} out of stock ·{" "}
            {skus.filter((s) => s.stock > 0 && s.stock <= 5).length} low stock
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="red">Out of Stock: {skus.filter((s) => s.stock === 0).length}</Badge>
          <Badge variant="sand">Low Stock: {skus.filter((s) => s.stock > 0 && s.stock <= 5).length}</Badge>
        </div>
      </div>

      <InventoryTable initialSkus={skus} />
    </div>
  );
}
