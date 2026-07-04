"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Upload, X, Check } from "lucide-react";

interface SkuRow {
  tempId: string;
  id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  skuCode: string;
}

interface ImageRow {
  tempId: string;
  id?: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  uploading?: boolean;
}

export interface ProductFormInitial {
  id?: string;
  name: string;
  slug: string;
  description: string;
  collectionId: string;
  basePrice: string;
  material: string;
  careInstr: string;
  tags: string;
  isVisible: boolean;
  isFeatured: boolean;
  skus: SkuRow[];
  images: ImageRow[];
}

interface ProductFormProps {
  initial: ProductFormInitial;
  collections: Array<{ id: string; name: string }>;
  mode: "create" | "edit";
}

export function ProductForm({ initial, collections, mode }: ProductFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [skus, setSkus] = useState<SkuRow[]>(initial.skus);
  const [images, setImages] = useState<ImageRow[]>(initial.images);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNameChange = (value: string) => {
    set("name", value);
    if (mode === "create") set("slug", slugify(value));
  };

  const addSku = () =>
    setSkus((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), size: "", color: "", price: "", stock: "0", skuCode: "" },
    ]);

  const updateSku = (tempId: string, key: keyof SkuRow, value: string) =>
    setSkus((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, [key]: value } : s)));

  const removeSku = (tempId: string) =>
    setSkus((prev) => prev.filter((s) => s.tempId !== tempId));

  const uploadImage = useCallback(
    async (file: File): Promise<{ url?: string; error?: string }> => {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { error: data.error || "Image upload failed." };
        return { url: data.url as string };
      } catch {
        return { error: "Image upload failed — please check your connection." };
      }
    },
    []
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const tempId = crypto.randomUUID();
      setImages((prev) => [
        ...prev,
        { tempId, url: "", altText: "", sortOrder: prev.length, isPrimary: prev.length === 0, uploading: true },
      ]);
      const { url, error: uploadError } = await uploadImage(file);
      if (url) {
        setImages((prev) =>
          prev.map((img) => (img.tempId === tempId ? { ...img, url, uploading: false } : img))
        );
      } else {
        setImages((prev) => prev.filter((img) => img.tempId !== tempId));
        setError(uploadError || "Failed to upload image. Check Cloudinary configuration.");
      }
    }
    e.target.value = "";
  };

  const removeImage = (tempId: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.tempId !== tempId);
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  };

  const setPrimary = (tempId: string) =>
    setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.tempId === tempId })));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.slug || !form.description || !form.basePrice) {
      setError("Please fill in all required fields (name, slug, description, price).");
      return;
    }
    if (!form.collectionId) {
      setError("Please choose a collection so the product appears in the right category on the storefront.");
      return;
    }
    if (skus.length === 0) {
      setError("Add at least one size variant.");
      return;
    }
    if (skus.some((s) => !s.size || !s.price || !s.skuCode)) {
      setError("Complete all SKU fields (size, price, SKU code).");
      return;
    }
    if (images.some((img) => img.uploading)) {
      setError("Please wait for images to finish uploading.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        collectionId: form.collectionId || null,
        basePrice: parseFloat(form.basePrice),
        material: form.material || null,
        careInstr: form.careInstr || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isVisible: form.isVisible,
        isFeatured: form.isFeatured,
        skus: skus.map((s) => ({
          ...(s.id ? { id: s.id } : {}),
          size: s.size,
          color: s.color || null,
          price: parseFloat(s.price),
          stock: parseInt(s.stock, 10),
          skuCode: s.skuCode,
        })),
        images: images.map((img, i) => ({
          url: img.url,
          altText: img.altText || null,
          sortOrder: i,
          isPrimary: img.isPrimary,
        })),
      };

      const url =
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save product.");
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-10 pb-16">
      {/* Basic Info */}
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Basic Info
        </h2>
        <div className="space-y-5 bg-white border border-[#e0e0e0] p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
                Product Name <span className="text-brand-wine">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ivory Silk Lehenga"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
                URL Slug <span className="text-[#888888] font-normal">(auto-generated)</span>
              </label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="ivory-silk-lehenga"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
              Description <span className="text-brand-wine">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full border border-[#e0e0e0] px-3 py-2 text-[13px] font-sans text-black placeholder:text-[#ccc] focus:outline-none focus:border-black transition-colors resize-none"
              placeholder="Describe the piece — fabric, craft, occasion..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
                Collection <span className="text-brand-gold">*</span>
              </label>
              <select
                value={form.collectionId}
                onChange={(e) => set("collectionId", e.target.value)}
                required
                className="w-full border border-[#e0e0e0] px-3 py-2.5 text-[13px] font-sans text-black bg-white focus:outline-none focus:border-black transition-colors appearance-none cursor-pointer"
              >
                <option value="">— Select a collection —</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
                Tags <span className="text-[#888888] font-normal">(comma-separated)</span>
              </label>
              <Input
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="bridal, festive, lehenga"
              />
            </div>
          </div>

          <div className="flex gap-8 pt-1">
            <Toggle
              checked={form.isVisible}
              onChange={(v) => set("isVisible", v)}
              label="Visible on store"
            />
            <Toggle
              checked={form.isFeatured}
              onChange={(v) => set("isFeatured", v)}
              label="Featured on home"
            />
          </div>
        </div>
      </section>

      {/* Pricing & Details */}
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Pricing &amp; Details
        </h2>
        <div className="space-y-5 bg-white border border-[#e0e0e0] p-6">
          <div>
            <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
              Base Price (₹) <span className="text-brand-wine">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.basePrice}
              onChange={(e) => set("basePrice", e.target.value)}
              placeholder="25000"
              required
            />
            <p className="text-[10px] font-sans text-[#888888] mt-1">
              Used for filtering. Each variant can have its own price.
            </p>
          </div>
          <div>
            <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
              Material
            </label>
            <Input
              value={form.material}
              onChange={(e) => set("material", e.target.value)}
              placeholder="Pure silk, Organza, Zardozi work"
            />
          </div>
          <div>
            <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
              Care Instructions
            </label>
            <textarea
              value={form.careInstr}
              onChange={(e) => set("careInstr", e.target.value)}
              rows={2}
              className="w-full border border-[#e0e0e0] px-3 py-2 text-[13px] font-sans text-black placeholder:text-[#ccc] focus:outline-none focus:border-black transition-colors resize-none"
              placeholder="Dry clean only. Store in muslin bag."
            />
          </div>
        </div>
      </section>

      {/* SKU Variants */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold">
              Size / Colour Variants
            </h2>
            <p className="text-[10px] font-sans text-[#aaa] mt-0.5">Each variant = one size+colour combo with its own stock</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addSku}>
            <Plus size={12} className="mr-1" /> Add Variant
          </Button>
        </div>

        {skus.length === 0 ? (
          <div className="border border-dashed border-[#e0e0e0] p-8 text-center">
            <p className="text-[12px] font-sans text-[#888888]">
              No variants yet. Click "Add Variant" to add the first size.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1.5fr_auto] gap-2 px-4 py-1">
              {["Size", "Colour", "Price ₹", "Stock", "SKU Code", ""].map((h) => (
                <span key={h} className="text-[10px] font-sans text-[#888888] uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>
            {skus.map((sku) => (
              <div
                key={sku.tempId}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1.5fr_auto] gap-2 bg-white border border-[#e0e0e0] p-3 items-center"
              >
                <Input
                  value={sku.size}
                  onChange={(e) => updateSku(sku.tempId, "size", e.target.value)}
                  placeholder="S / M / 38"
                />
                <Input
                  value={sku.color}
                  onChange={(e) => updateSku(sku.tempId, "color", e.target.value)}
                  placeholder="Ivory"
                />
                <Input
                  type="number"
                  min="0"
                  value={sku.price}
                  onChange={(e) => updateSku(sku.tempId, "price", e.target.value)}
                  placeholder="25000"
                />
                <Input
                  type="number"
                  min="0"
                  value={sku.stock}
                  onChange={(e) => updateSku(sku.tempId, "stock", e.target.value)}
                />
                <Input
                  value={sku.skuCode}
                  onChange={(e) => updateSku(sku.tempId, "skuCode", e.target.value)}
                  placeholder="DS-001-S-IVY"
                />
                <button
                  type="button"
                  onClick={() => removeSku(sku.tempId)}
                  className="p-1.5 text-[#888888] hover:text-brand-wine transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Images */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold">
              Product Images
            </h2>
            <p className="text-[10px] font-sans text-[#aaa] mt-0.5">Click an image to set it as primary</p>
          </div>
        </div>

        <div className="bg-white border border-[#e0e0e0] p-6">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#e0e0e0] p-8 cursor-pointer hover:border-black transition-colors">
            <Upload size={24} className="text-[#888888] mb-2" />
            <span className="text-[12px] font-sans text-[#888888]">
              Click to upload (JPG, PNG, WebP · multiple allowed)
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
              {images.map((img) => (
                <div
                  key={img.tempId}
                  onClick={() => !img.uploading && setPrimary(img.tempId)}
                  className={`relative aspect-[3/4] bg-brand-ivory-deep border-2 cursor-pointer transition-colors ${
                    img.isPrimary ? "border-brand-gold" : "border-transparent hover:border-brand-champagne"
                  }`}
                >
                  {img.uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={img.altText || "Product image"}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {img.isPrimary && !img.uploading && (
                    <span className="absolute top-1 left-1 bg-brand-gold text-white rounded-full w-4 h-4 flex items-center justify-center">
                      <Check size={8} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.tempId);
                    }}
                    className="absolute top-1 right-1 bg-white/80 hover:bg-brand-wine hover:text-white text-[#888888] rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Error + Actions */}
      {error && (
        <p className="text-[12px] font-sans text-brand-wine bg-brand-wine/5 border border-brand-wine/20 px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-4">
        <Button type="submit" loading={loading}>
          {mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-brand-ink" : "bg-brand-ivory-deep"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-[12px] font-sans text-black">{label}</span>
    </label>
  );
}
