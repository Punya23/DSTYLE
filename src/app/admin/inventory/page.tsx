import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { InventoryTable } from "@/components/admin/InventoryTable";

// Plain, client-safe shape. Prisma's `Decimal` price can't cross the
// Server→Client boundary (React warns "Only plain objects can be passed"),
// so convert it to a number here before handing the rows to InventoryTable.
type SkuWithProduct = {
  id: string;
  skuCode: string;
  size: string;
  color: string | null;
  stock: number;
  price: number;
  product: { id: string; name: string; slug: string };
};

async function getInventory(): Promise<SkuWithProduct[]> {
  try {
    const rows = await prisma.sKU.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ product: { name: "asc" } }, { size: "asc" }],
    });
    return rows.map((s) => ({
      id: s.id,
      skuCode: s.skuCode,
      size: s.size,
      color: s.color,
      stock: s.stock,
      price: Number(s.price),
      product: s.product,
    }));
  } catch {
    return [];
  }
}

export default async function AdminInventoryPage() {
  const skus = await getInventory();

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
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
