"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IMAGE_KINDS,
  IMAGE_KIND_LABELS,
  VIDEO_KINDS,
  VIDEO_KIND_LABELS,
} from "@/lib/product-schema";
import { Trash2, Plus, Upload, X, Check, Film } from "lucide-react";

type ImageKind = (typeof IMAGE_KINDS)[number];
type VideoKind = (typeof VIDEO_KINDS)[number];

interface SkuRow {
  tempId: string;
  id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  skuCode: string;
  isActive: boolean;
  lowStockAt: string;
}

interface ImageRow {
  tempId: string;
  id?: string;
  url: string;
  altText: string;
  kind: ImageKind;
  sortOrder: number;
  isPrimary: boolean;
  uploading?: boolean;
}

interface VideoRow {
  tempId: string;
  id?: string;
  url: string;
  posterUrl: string;
  kind: VideoKind;
  durationSec: string;
  sortOrder: number;
  uploading?: boolean;
}

export interface ProductFormInitial {
  id?: string;
  name: string;
  slug: string;
  description: string;
  collectionId: string;
  basePrice: string;
  tags: string;
  isVisible: boolean;
  isFeatured: boolean;

  // Fashion attributes
  material: string;
  fabric: string;
  sleeve: string;
  neck: string;
  length: string;
  careInstr: string;
  deliveryTime: string;

  // Tax
  priceIncludesGst: boolean;
  gstRate: string;
  gstExempt: boolean;
  hsnCode: string;

  skus: SkuRow[];
  images: ImageRow[];
  videos: VideoRow[];
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
  const [videos, setVideos] = useState<VideoRow[]>(initial.videos);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNameChange = (value: string) => {
    set("name", value);
    if (mode === "create") set("slug", slugify(value));
  };

  /* ---------------------------------------------------------------- SKUs */

  const addSku = () =>
    setSkus((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        size: "",
        color: "",
        price: "",
        stock: "0",
        skuCode: "",
        isActive: true,
        lowStockAt: "3",
      },
    ]);

  const updateSku = (tempId: string, key: keyof SkuRow, value: string | boolean) =>
    setSkus((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, [key]: value } : s)));

  const removeSku = (tempId: string) =>
    setSkus((prev) => prev.filter((s) => s.tempId !== tempId));

  /* -------------------------------------------------------------- Uploads */

  const upload = useCallback(
    async (
      file: File,
      kind: "image" | "video"
    ): Promise<{
      url?: string;
      posterUrl?: string;
      durationSec?: number;
      error?: string;
    }> => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { error: data.error || `${kind} upload failed.` };
        return {
          url: data.url as string,
          posterUrl: data.posterUrl as string | undefined,
          durationSec: data.durationSec as number | undefined,
        };
      } catch {
        return { error: "Upload failed — please check your connection." };
      }
    },
    []
  );

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const tempId = crypto.randomUUID();
      setImages((prev) => [
        ...prev,
        {
          tempId,
          url: "",
          altText: "",
          // The first upload becomes the front shot and the card image; the
          // admin can re-tag any of them afterwards.
          kind: prev.length === 0 ? "FRONT" : "OTHER",
          sortOrder: prev.length,
          isPrimary: prev.length === 0,
          uploading: true,
        },
      ]);

      const { url, error: uploadError } = await upload(file, "image");
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

  const handleVideoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const tempId = crypto.randomUUID();
      setVideos((prev) => [
        ...prev,
        {
          tempId,
          url: "",
          posterUrl: "",
          kind: "REEL",
          durationSec: "",
          sortOrder: prev.length,
          uploading: true,
        },
      ]);

      const { url, posterUrl, durationSec, error: uploadError } = await upload(file, "video");
      if (url) {
        setVideos((prev) =>
          prev.map((v) =>
            v.tempId === tempId
              ? {
                  ...v,
                  url,
                  posterUrl: posterUrl ?? "",
                  durationSec: durationSec ? String(durationSec) : "",
                  uploading: false,
                }
              : v
          )
        );
      } else {
        setVideos((prev) => prev.filter((v) => v.tempId !== tempId));
        setError(uploadError || "Failed to upload video.");
      }
    }
    e.target.value = "";
  };

  const removeImage = (tempId: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.tempId !== tempId);
      // Something must stay primary — otherwise the card has no image.
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  };

  const setPrimary = (tempId: string) =>
    setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.tempId === tempId })));

  const setImageKind = (tempId: string, kind: ImageKind) =>
    setImages((prev) => prev.map((img) => (img.tempId === tempId ? { ...img, kind } : img)));

  /* --------------------------------------------------------------- Submit */

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
    if (images.some((img) => img.uploading) || videos.some((v) => v.uploading)) {
      setError("Please wait for uploads to finish.");
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
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isVisible: form.isVisible,
        isFeatured: form.isFeatured,

        material: form.material || null,
        fabric: form.fabric || null,
        sleeve: form.sleeve || null,
        neck: form.neck || null,
        length: form.length || null,
        careInstr: form.careInstr || null,
        deliveryTime: form.deliveryTime || null,

        priceIncludesGst: form.priceIncludesGst,
        gstRate: form.gstRate.trim() === "" ? null : parseFloat(form.gstRate),
        gstExempt: form.gstExempt,
        hsnCode: form.hsnCode || null,

        skus: skus.map((s, i) => ({
          ...(s.id ? { id: s.id } : {}),
          size: s.size,
          color: s.color || null,
          price: parseFloat(s.price),
          stock: parseInt(s.stock, 10) || 0,
          skuCode: s.skuCode,
          isActive: s.isActive,
          lowStockAt: parseInt(s.lowStockAt, 10) || 0,
          sortOrder: i,
        })),
        images: images.map((img, i) => ({
          url: img.url,
          altText: img.altText || null,
          kind: img.kind,
          sortOrder: i,
          isPrimary: img.isPrimary,
        })),
        videos: videos.map((v, i) => ({
          url: v.url,
          posterUrl: v.posterUrl || null,
          kind: v.kind,
          durationSec: v.durationSec ? parseInt(v.durationSec, 10) : null,
          sortOrder: i,
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

  const fieldClass =
    "w-full border border-[#e0e0e0] px-3 py-2 text-[13px] font-sans text-black placeholder:text-[#ccc] focus:outline-none focus:border-black transition-colors";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-10 pb-16">
      {/* Basic Info */}
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Basic Info
        </h2>
        <div className="space-y-5 bg-white border border-[#e0e0e0] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              className={`${fieldClass} resize-none`}
              placeholder="Describe the piece — fabric, craft, occasion..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
                Collection <span className="text-brand-gold">*</span>
              </label>
              <select
                value={form.collectionId}
                onChange={(e) => set("collectionId", e.target.value)}
                required
                className={`${fieldClass} bg-white py-2.5 appearance-none cursor-pointer`}
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

      {/* Pricing & Tax */}
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Pricing &amp; Tax
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

          <div className="pt-1 space-y-4 border-t border-[#f0f0f0]">
            <Toggle
              checked={form.priceIncludesGst}
              onChange={(v) => set("priceIncludesGst", v)}
              label="Price includes GST"
              hint="Off means GST is added on top of the listed price at checkout."
            />
            <Toggle
              checked={form.gstExempt}
              onChange={(v) => set("gstExempt", v)}
              label="Exclude GST on this product"
              hint="No tax is charged on this piece at all."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
                  GST Rate Override (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.gstRate}
                  onChange={(e) => set("gstRate", e.target.value)}
                  placeholder="Auto (price slab)"
                  disabled={form.gstExempt}
                />
                <p className="text-[10px] font-sans text-[#888888] mt-1">
                  Leave blank to use the store slab: 5% up to the threshold, 18% above.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-sans font-medium text-black mb-1.5">
                  HSN Code
                </label>
                <Input
                  value={form.hsnCode}
                  onChange={(e) => set("hsnCode", e.target.value)}
                  placeholder="6204"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fashion attributes */}
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Garment Details
        </h2>
        <div className="space-y-5 bg-white border border-[#e0e0e0] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelledInput
              label="Fabric"
              value={form.fabric}
              onChange={(v) => set("fabric", v)}
              placeholder="Chanderi silk"
            />
            <LabelledInput
              label="Material"
              value={form.material}
              onChange={(v) => set("material", v)}
              placeholder="Pure silk with zardozi work"
            />
            <LabelledInput
              label="Sleeve"
              value={form.sleeve}
              onChange={(v) => set("sleeve", v)}
              placeholder="Three-quarter"
            />
            <LabelledInput
              label="Neck"
              value={form.neck}
              onChange={(v) => set("neck", v)}
              placeholder="Sweetheart"
            />
            <LabelledInput
              label="Length"
              value={form.length}
              onChange={(v) => set("length", v)}
              placeholder="Floor length"
            />
            <LabelledInput
              label="Delivery Time"
              value={form.deliveryTime}
              onChange={(v) => set("deliveryTime", v)}
              placeholder="Ships in 2–4 weeks"
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
              className={`${fieldClass} resize-none`}
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
            <p className="text-[10px] font-sans text-[#aaa] mt-0.5">
              Each variant holds its own stock. A size stops selling on its own at zero.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addSku}>
            <Plus size={12} className="mr-1" /> Add Variant
          </Button>
        </div>

        {skus.length === 0 ? (
          <div className="border border-dashed border-[#e0e0e0] p-8 text-center">
            <p className="text-[12px] font-sans text-[#888888]">
              No variants yet. Click &ldquo;Add Variant&rdquo; to add the first size.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden lg:grid grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_1.4fr_auto_auto] gap-2 px-3 py-1">
              {["Size", "Colour", "Price ₹", "Stock", "Low at", "SKU Code", "Live", ""].map((h) => (
                <span
                  key={h}
                  className="text-[10px] font-sans text-[#888888] uppercase tracking-widest"
                >
                  {h}
                </span>
              ))}
            </div>
            {skus.map((sku) => {
              const out = (parseInt(sku.stock, 10) || 0) === 0;
              return (
                <div
                  key={sku.tempId}
                  className={`grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_1.4fr_auto_auto] gap-2 bg-white border p-3 items-center ${
                    out ? "border-brand-wine/30" : "border-[#e0e0e0]"
                  }`}
                >
                  <Input
                    value={sku.size}
                    onChange={(e) => updateSku(sku.tempId, "size", e.target.value)}
                    placeholder="S / M / 38"
                    aria-label="Size"
                  />
                  <Input
                    value={sku.color}
                    onChange={(e) => updateSku(sku.tempId, "color", e.target.value)}
                    placeholder="Ivory"
                    aria-label="Colour"
                  />
                  <Input
                    type="number"
                    min="0"
                    value={sku.price}
                    onChange={(e) => updateSku(sku.tempId, "price", e.target.value)}
                    placeholder="25000"
                    aria-label="Price"
                  />
                  <Input
                    type="number"
                    min="0"
                    value={sku.stock}
                    onChange={(e) => updateSku(sku.tempId, "stock", e.target.value)}
                    aria-label="Stock"
                  />
                  <Input
                    type="number"
                    min="0"
                    value={sku.lowStockAt}
                    onChange={(e) => updateSku(sku.tempId, "lowStockAt", e.target.value)}
                    aria-label="Low stock threshold"
                  />
                  <Input
                    value={sku.skuCode}
                    onChange={(e) => updateSku(sku.tempId, "skuCode", e.target.value)}
                    placeholder="DS-001-S-IVY"
                    aria-label="SKU code"
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sku.isActive}
                    aria-label="Variant is live"
                    onClick={() => updateSku(sku.tempId, "isActive", !sku.isActive)}
                    className={`relative w-9 h-[18px] rounded-full transition-colors justify-self-center ${
                      sku.isActive ? "bg-brand-ink" : "bg-brand-ivory-deep"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-[14px] h-[14px] bg-white rounded-full shadow transition-transform ${
                        sku.isActive ? "translate-x-[19px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSku(sku.tempId)}
                    className="p-1.5 text-[#888888] hover:text-brand-wine transition-colors justify-self-end"
                    aria-label="Remove variant"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Images */}
      <section>
        <div className="mb-4">
          <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold">
            Product Images
          </h2>
          <p className="text-[10px] font-sans text-[#aaa] mt-0.5">
            Tag each shot — front, back, fabric, on-model. Six to ten photos is the luxury norm.
          </p>
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
              onChange={handleImageFiles}
            />
          </label>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
              {images.map((img) => (
                <div key={img.tempId} className="space-y-1.5">
                  <div
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
                      aria-label="Remove image"
                    >
                      <X size={10} />
                    </button>
                  </div>

                  <select
                    value={img.kind}
                    onChange={(e) => setImageKind(img.tempId, e.target.value as ImageKind)}
                    className="w-full border border-[#e0e0e0] px-1.5 py-1 text-[10px] font-sans text-black bg-white focus:outline-none focus:border-black cursor-pointer"
                    aria-label="Shot type"
                  >
                    {IMAGE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {IMAGE_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Videos */}
      <section>
        <div className="mb-4">
          <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold">
            Product Video
          </h2>
          <p className="text-[10px] font-sans text-[#aaa] mt-0.5">
            A 20-second reel, a 360° spin or ramp-walk footage. Up to 100 MB each.
          </p>
        </div>

        <div className="bg-white border border-[#e0e0e0] p-6">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#e0e0e0] p-8 cursor-pointer hover:border-black transition-colors">
            <Film size={24} className="text-[#888888] mb-2" />
            <span className="text-[12px] font-sans text-[#888888]">
              Click to upload (MP4, MOV, WebM)
            </span>
            <input
              type="file"
              accept="video/*"
              multiple
              className="sr-only"
              onChange={handleVideoFiles}
            />
          </label>

          {videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {videos.map((video) => (
                <div key={video.tempId} className="space-y-1.5">
                  <div className="relative aspect-[9/16] bg-brand-ivory-deep overflow-hidden">
                    {video.uploading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <video
                        src={video.url}
                        poster={video.posterUrl || undefined}
                        controls
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setVideos((prev) => prev.filter((v) => v.tempId !== video.tempId))
                      }
                      className="absolute top-1 right-1 z-10 bg-white/80 hover:bg-brand-wine hover:text-white text-[#888888] rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                      aria-label="Remove video"
                    >
                      <X size={10} />
                    </button>
                  </div>

                  <select
                    value={video.kind}
                    onChange={(e) =>
                      setVideos((prev) =>
                        prev.map((v) =>
                          v.tempId === video.tempId
                            ? { ...v, kind: e.target.value as VideoKind }
                            : v
                        )
                      )
                    }
                    className="w-full border border-[#e0e0e0] px-1.5 py-1 text-[10px] font-sans text-black bg-white focus:outline-none focus:border-black cursor-pointer"
                    aria-label="Video type"
                  >
                    {VIDEO_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {VIDEO_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
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
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-sans font-medium text-black mb-1.5">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-10 h-5 rounded-full transition-colors ${
          checked ? "bg-brand-ink" : "bg-brand-ivory-deep"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span>
        <span className="block text-[12px] font-sans text-black">{label}</span>
        {hint && <span className="block text-[11px] font-sans text-[#888888] mt-0.5">{hint}</span>}
      </span>
    </div>
  );
}
