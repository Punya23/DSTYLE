import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { InventoryTable, type SKUWithProduct } from "@/components/admin/InventoryTable";

// Plain, client-safe shape. Prisma's `Decimal` price can't cross the
// Server→Client boundary (React warns "Only plain objects can be passed"),
// so convert it to a number here before handing the rows to InventoryTable.
async function getInventory(): Promise<SKUWithProduct[]> {
  try {
    const rows = await prisma.sKU.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }, { size: "asc" }],
    });
    return rows.map((s) => ({
      id: s.id,
      skuCode: s.skuCode,
      size: s.size,
      color: s.color,
      stock: s.stock,
      price: Number(s.price),
      isActive: s.isActive,
      lowStockAt: s.lowStockAt,
      product: s.product,
    }));
  } catch {
    return [];
  }
}

export default async function AdminInventoryPage() {
  const skus = await getInventory();

  const outOfStock = skus.filter((s) => s.stock === 0).length;
  const lowStock = skus.filter((s) => s.stock > 0 && s.stock <= s.lowStockAt).length;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">Stock</p>
          <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">Inventory</h1>
          <p className="text-[11px] font-sans text-[#888888] mt-1">
            Stock is tracked per size. A size at zero stops selling automatically.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="red">Out of Stock: {outOfStock}</Badge>
          <Badge variant="sand">Low Stock: {lowStock}</Badge>
        </div>
      </div>

      <InventoryTable initialSkus={skus} />
    </div>
  );
}
