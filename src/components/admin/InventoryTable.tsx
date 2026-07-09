"use client";

import { useState } from "react";
import { Save, Check } from "lucide-react";

interface SKUWithProduct {
  id: string;
  skuCode: string;
  size: string;
  color: string | null;
  stock: number;
  price: unknown;
  product: { id: string; name: string; slug: string };
}

interface InventoryTableProps {
  initialSkus: SKUWithProduct[];
}

export function InventoryTable({ initialSkus }: InventoryTableProps) {
  const [skus, setSkus] = useState(initialSkus);
  const [edited, setEdited] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleStockChange = (skuId: string, value: number) => {
    setEdited((prev) => ({ ...prev, [skuId]: value }));
  };

  const handleSave = async (skuId: string) => {
    const newStock = edited[skuId];
    if (newStock === undefined) return;

    setSaving(skuId);
    try {
      const res = await fetch(`/api/admin/inventory/${skuId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });

      if (res.ok) {
        setSkus((prev) =>
          prev.map((s) => (s.id === skuId ? { ...s, stock: newStock } : s))
        );
        setEdited((prev) => {
          const next = { ...prev };
          delete next[skuId];
          return next;
        });
        setSaved((prev) => ({ ...prev, [skuId]: true }));
        setTimeout(() => setSaved((prev) => ({ ...prev, [skuId]: false })), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white border border-[#e0e0e0]">
      <table className="w-full">
        <thead className="border-b border-[#e0e0e0]">
          <tr>
            {["Product", "SKU Code", "Size", "Color", "Stock", ""].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-[10px] font-sans font-medium tracking-widest uppercase text-[#888888]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skus.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-12 text-center text-[12px] font-sans text-[#888888]"
              >
                No SKUs yet. Add products first.
              </td>
            </tr>
          ) : (
            skus.map((sku) => {
              const currentStock = edited[sku.id] ?? sku.stock;
              const isLow = currentStock > 0 && currentStock <= 5;
              const isOut = currentStock === 0;

              return (
                <tr
                  key={sku.id}
                  className={`border-b border-[#f5f5f5] ${
                    isOut ? "bg-red-50" : isLow ? "bg-yellow-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-[12px] font-sans font-medium text-black">
                    {sku.product.name}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#888888]">
                    {sku.skuCode}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-sans text-black">
                    {sku.size}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-sans text-[#888888]">
                    {sku.color ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStockChange(sku.id, Math.max(0, currentStock - 1))}
                        className="h-7 w-7 flex items-center justify-center border border-[#e0e0e0] hover:border-black transition-colors text-sm"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={currentStock}
                        onChange={(e) =>
                          handleStockChange(sku.id, Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className={`w-16 text-center text-[12px] font-sans border px-2 py-1 focus:outline-none focus:border-black ${
                          isOut
                            ? "border-red-400 text-red-600"
                            : isLow
                            ? "border-yellow-400 text-yellow-700"
                            : "border-[#e0e0e0] text-black"
                        }`}
                      />
                      <button
                        onClick={() => handleStockChange(sku.id, currentStock + 1)}
                        className="h-7 w-7 flex items-center justify-center border border-[#e0e0e0] hover:border-black transition-colors text-sm"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {edited[sku.id] !== undefined && (
                      <button
                        onClick={() => handleSave(sku.id)}
                        disabled={saving === sku.id}
                        style={{ backgroundColor: "var(--color-brand-ink)", color: "#ffffff" }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans tracking-luxe uppercase transition-[filter,opacity] hover:brightness-125 disabled:opacity-50"
                      >
                        {saved[sku.id] ? (
                          <Check size={11} />
                        ) : (
                          <Save size={11} />
                        )}
                        {saving === sku.id ? "Saving..." : saved[sku.id] ? "Saved" : "Save"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
