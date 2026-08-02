"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Save, Search } from "lucide-react";
import { sizeRank } from "@/lib/inventory";
import { cn } from "@/lib/utils";

export interface SKUWithProduct {
  id: string;
  skuCode: string;
  size: string;
  color: string | null;
  stock: number;
  price: number;
  isActive: boolean;
  lowStockAt: number;
  product: { id: string; name: string; slug: string };
}

interface InventoryTableProps {
  initialSkus: SKUWithProduct[];
}

/**
 * Stock is edited per size, grouped under its product — the whole point of
 * "Dress: S-2, M-4, L-1, XL-0" rather than one number for the garment.
 *
 * A size at zero is unbuyable on the storefront without anyone flipping a
 * switch; the badges here just make that state visible to staff.
 */
export function InventoryTable({ initialSkus }: InventoryTableProps) {
  const [skus, setSkus] = useState(initialSkus);
  const [edited, setEdited] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [onlyProblems, setOnlyProblems] = useState(false);

  const groups = useMemo(() => {
    const stockOf = (sku: SKUWithProduct) => edited[sku.id] ?? sku.stock;
    const needle = query.trim().toLowerCase();

    const byProduct = new Map<string, { name: string; rows: SKUWithProduct[] }>();
    for (const sku of skus) {
      if (needle && !`${sku.product.name} ${sku.skuCode}`.toLowerCase().includes(needle)) {
        continue;
      }
      const entry = byProduct.get(sku.product.id) ?? { name: sku.product.name, rows: [] };
      entry.rows.push(sku);
      byProduct.set(sku.product.id, entry);
    }

    return [...byProduct.entries()]
      .map(([id, entry]) => ({
        id,
        name: entry.name,
        rows: [...entry.rows].sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
        total: entry.rows.reduce((sum, r) => sum + stockOf(r), 0),
      }))
      .filter((group) =>
        onlyProblems ? group.rows.some((r) => stockOf(r) <= r.lowStockAt) : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [skus, edited, query, onlyProblems]);

  const setStock = (skuId: string, value: number) =>
    setEdited((prev) => ({ ...prev, [skuId]: Math.max(0, value) }));

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
        setSkus((prev) => prev.map((s) => (s.id === skuId ? { ...s, stock: newStock } : s)));
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

  /** Save every pending edit for one product in one go. */
  const saveGroup = async (rows: SKUWithProduct[]) => {
    for (const row of rows) {
      if (edited[row.id] !== undefined) await handleSave(row.id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or SKU code"
            className="w-full border border-[#e0e0e0] bg-white pl-9 pr-3 py-2.5 text-[12px] font-sans text-black placeholder:text-[#bbb] focus:outline-none focus:border-black transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 text-[11px] font-sans text-[#888888] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyProblems}
            onChange={(e) => setOnlyProblems(e.target.checked)}
            className="accent-black"
          />
          Only low or out of stock
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] px-4 py-12 text-center text-[12px] font-sans text-[#888888]">
          {skus.length === 0 ? "No SKUs yet. Add products first." : "Nothing matches that search."}
        </div>
      ) : (
        groups.map((group) => {
          const pending = group.rows.some((r) => edited[r.id] !== undefined);

          return (
            <div key={group.id} className="bg-white border border-[#e0e0e0]">
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[#f0f0f0]">
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${group.id}`}
                    className="text-[13px] font-sans font-medium text-black hover:text-brand-gold-deep transition-colors"
                  >
                    {group.name}
                  </Link>
                  <p className="text-[10px] font-sans text-[#888888] mt-0.5">
                    {group.total} in stock across {group.rows.length} size
                    {group.rows.length === 1 ? "" : "s"}
                  </p>
                </div>
                {pending && (
                  <button
                    onClick={() => saveGroup(group.rows)}
                    style={{ backgroundColor: "var(--color-brand-ink)", color: "#ffffff" }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans tracking-luxe uppercase hover:brightness-125 transition-[filter]"
                  >
                    <Save size={11} /> Save all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4">
                {group.rows.map((sku) => {
                  const stock = edited[sku.id] ?? sku.stock;
                  const out = stock === 0;
                  const low = !out && stock <= sku.lowStockAt;
                  const dirty = edited[sku.id] !== undefined;

                  return (
                    <div
                      key={sku.id}
                      className={cn(
                        "border p-3",
                        out
                          ? "border-brand-wine/40 bg-brand-wine/5"
                          : low
                            ? "border-yellow-400/60 bg-yellow-50"
                            : "border-[#e8e8e8]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="text-[13px] font-sans font-medium text-black truncate">
                          {sku.size}
                          {sku.color && (
                            <span className="text-[10px] text-[#888888] ml-1.5">{sku.color}</span>
                          )}
                        </span>
                        {!sku.isActive ? (
                          <span className="shrink-0 text-[8px] font-sans tracking-widest uppercase text-[#888888]">
                            Disabled
                          </span>
                        ) : out ? (
                          <span className="shrink-0 text-[8px] font-sans tracking-widest uppercase text-brand-wine">
                            Sold out
                          </span>
                        ) : low ? (
                          <span className="shrink-0 text-[8px] font-sans tracking-widest uppercase text-yellow-700">
                            Low
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setStock(sku.id, stock - 1)}
                          className="h-7 w-7 shrink-0 flex items-center justify-center border border-[#e0e0e0] hover:border-black transition-colors text-sm"
                          aria-label={`Decrease ${sku.size} stock`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={stock}
                          onChange={(e) => setStock(sku.id, parseInt(e.target.value, 10) || 0)}
                          className={cn(
                            "w-full min-w-0 text-center text-[12px] font-sans border px-1 py-1 focus:outline-none focus:border-black",
                            out
                              ? "border-brand-wine/40 text-brand-wine"
                              : low
                                ? "border-yellow-400 text-yellow-700"
                                : "border-[#e0e0e0] text-black"
                          )}
                          aria-label={`${sku.size} stock`}
                        />
                        <button
                          onClick={() => setStock(sku.id, stock + 1)}
                          className="h-7 w-7 shrink-0 flex items-center justify-center border border-[#e0e0e0] hover:border-black transition-colors text-sm"
                          aria-label={`Increase ${sku.size} stock`}
                        >
                          +
                        </button>
                      </div>

                      <p className="mt-2 text-[9px] font-mono text-[#aaa] truncate">
                        {sku.skuCode}
                      </p>

                      {dirty && (
                        <button
                          onClick={() => handleSave(sku.id)}
                          disabled={saving === sku.id}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-sans tracking-luxe uppercase border border-brand-ink text-brand-ink hover:bg-brand-ink hover:text-white transition-colors disabled:opacity-50"
                        >
                          {saved[sku.id] ? <Check size={10} /> : <Save size={10} />}
                          {saving === sku.id ? "Saving" : saved[sku.id] ? "Saved" : "Save"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
