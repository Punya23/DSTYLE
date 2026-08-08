"use client";

import { forwardRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IMAGE_KINDS,
  IMAGE_KIND_LABELS,
  VIDEO_KINDS,
  VIDEO_KIND_LABELS,
  productFormSchema,
  productFormToPayload,
  type ProductFormInput,
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
  /** Optional so callers that predate compare-at pricing still type-check. */
  mrp?: string;
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
  /** Server-side and upload failures — everything else surfaces per field. */
  const [formError, setFormError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    // `mrp` is optional on the initial shape but the input has to stay
    // controlled, so it is filled in rather than left undefined.
    defaultValues: { ...initial, mrp: initial.mrp ?? "" },
  });

  /**
   * The three media/variant arrays live in form state so the schema validates
   * them alongside everything else. They're read back with `useWatch` rather
   * than `useFieldArray` because every row is addressed by its `tempId` — the
   * upload callbacks resolve long after the row was appended, by which time an
   * index may point somewhere else entirely. (`useWatch` over `watch`: the
   * latter returns a fresh function each render, which makes the React Compiler
   * skip memoizing this component.)
   */
  const skus = useWatch({ control, name: "skus" });
  const images = useWatch({ control, name: "images" });
  const videos = useWatch({ control, name: "videos" });
  const gstExempt = useWatch({ control, name: "gstExempt" });

  const setSkus = (next: SkuRow[]) => setValue("skus", next, { shouldValidate: true });
  const setImages = (next: ImageRow[]) => setValue("images", next, { shouldValidate: true });
  const setVideos = (next: VideoRow[]) => setValue("videos", next, { shouldValidate: true });

  /* ---------------------------------------------------------------- SKUs */

  const addSku = () =>
    setSkus([
      ...skus,
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
    setSkus(skus.map((s) => (s.tempId === tempId ? { ...s, [key]: value } : s)));

  const removeSku = (tempId: string) => setSkus(skus.filter((s) => s.tempId !== tempId));

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

  // These callbacks await an upload between reading and writing the array, so
  // they always re-read through `getValues` — the `watch` snapshot captured at
  // render time would be stale by the time the request comes back, and two
  // concurrent uploads would clobber each other.
  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const tempId = crypto.randomUUID();
      const current = getValues("images");
      setImages([
        ...current,
        {
          tempId,
          url: "",
          altText: "",
          // The first upload becomes the front shot and the card image; the
          // admin can re-tag any of them afterwards.
          kind: current.length === 0 ? "FRONT" : "OTHER",
          sortOrder: current.length,
          isPrimary: current.length === 0,
          uploading: true,
        },
      ]);

      const { url, error: uploadError } = await upload(file, "image");
      if (url) {
        setImages(
          getValues("images").map((img) =>
            img.tempId === tempId ? { ...img, url, uploading: false } : img
          )
        );
      } else {
        setImages(getValues("images").filter((img) => img.tempId !== tempId));
        setFormError(uploadError || "Failed to upload image. Check Cloudinary configuration.");
      }
    }
    e.target.value = "";
  };

  const handleVideoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const tempId = crypto.randomUUID();
      const current = getValues("videos");
      setVideos([
        ...current,
        {
          tempId,
          url: "",
          posterUrl: "",
          kind: "REEL",
          durationSec: "",
          sortOrder: current.length,
          uploading: true,
        },
      ]);

      const { url, posterUrl, durationSec, error: uploadError } = await upload(file, "video");
      if (url) {
        setVideos(
          getValues("videos").map((v) =>
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
        setVideos(getValues("videos").filter((v) => v.tempId !== tempId));
        setFormError(uploadError || "Failed to upload video.");
      }
    }
    e.target.value = "";
  };

  const removeImage = (tempId: string) => {
    const filtered = images.filter((img) => img.tempId !== tempId);
    // Something must stay primary — otherwise the card has no image.
    if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
      filtered[0] = { ...filtered[0], isPrimary: true };
    }
    setImages(filtered);
  };

  const setPrimary = (tempId: string) =>
    setImages(images.map((img) => ({ ...img, isPrimary: img.tempId === tempId })));

  const setImageKind = (tempId: string, kind: ImageKind) =>
    setImages(images.map((img) => (img.tempId === tempId ? { ...img, kind } : img)));

  /* --------------------------------------------------------------- Submit */

  const onSubmit = async (form: ProductFormInput) => {
    setFormError("");

    try {
      const url =
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productFormToPayload(form)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error ?? "Failed to save product.");
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    }
  };

  const fieldClass =
    "w-full border border-[#e0e0e0] px-3 py-2 text-[13px] font-sans text-black placeholder:text-[#ccc] focus:outline-none focus:border-black transition-colors";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-10 pb-16" noValidate>
      {/* Basic Info */}
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Basic Info
        </h2>
        <div className="space-y-5 bg-white border border-[#e0e0e0] p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="product-name"
                className="block text-[11px] font-sans font-medium text-black mb-1.5"
              >
                Product Name <span className="text-brand-wine">*</span>
              </label>
              <Input
                id="product-name"
                placeholder="Ivory Silk Lehenga"
                error={errors.name?.message}
                {...register("name", {
                  // A new product's slug tracks its name; an existing one keeps
                  // the slug it was published under so links don't break.
                  onChange: (e) => {
                    if (mode === "create") {
                      setValue("slug", slugify(e.target.value), { shouldValidate: true });
                    }
                  },
                })}
              />
            </div>
            <div>
              <label
                htmlFor="product-slug"
                className="block text-[11px] font-sans font-medium text-black mb-1.5"
              >
                URL Slug <span className="text-[#888888] font-normal">(auto-generated)</span>
              </label>
              <Input
                id="product-slug"
                placeholder="ivory-silk-lehenga"
                error={errors.slug?.message}
                {...register("slug")}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="product-description"
              className="block text-[11px] font-sans font-medium text-black mb-1.5"
            >
              Description <span className="text-brand-wine">*</span>
            </label>
            <textarea
              id="product-description"
              rows={4}
              className={`${fieldClass} resize-none`}
              placeholder="Describe the piece — fabric, craft, occasion..."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-[11px] font-sans text-brand-wine mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="product-collection"
                className="block text-[11px] font-sans font-medium text-black mb-1.5"
              >
                Collection <span className="text-brand-gold">*</span>
              </label>
              <select
                id="product-collection"
                className={`${fieldClass} bg-white py-2.5 appearance-none cursor-pointer`}
                {...register("collectionId")}
              >
                <option value="">— Select a collection —</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              {errors.collectionId && (
                <p className="text-[11px] font-sans text-brand-wine mt-1">
                  {errors.collectionId.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="product-tags"
                className="block text-[11px] font-sans font-medium text-black mb-1.5"
              >
                Tags <span className="text-[#888888] font-normal">(comma-separated)</span>
              </label>
              <Input
                id="product-tags"
                placeholder="bridal, festive, lehenga"
                error={errors.tags?.message}
                {...register("tags")}
              />
            </div>
          </div>

          <div className="flex gap-8 pt-1">
            <Controller
              control={control}
              name="isVisible"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Visible on store"
                />
              )}
            />
            <Controller
              control={control}
              name="isFeatured"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Featured on home"
                />
              )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="product-base-price"
                className="block text-[11px] font-sans font-medium text-black mb-1.5"
              >
                Base Price (₹) <span className="text-brand-wine">*</span>
              </label>
              <Input
                id="product-base-price"
                type="number"
                min="0"
                step="1"
                placeholder="25000"
                error={errors.basePrice?.message}
                {...register("basePrice")}
              />
              <p className="text-[10px] font-sans text-[#888888] mt-1">
                Used for filtering. Each variant can have its own price.
              </p>
            </div>
            <div>
              <label
                htmlFor="product-mrp"
                className="block text-[11px] font-sans font-medium text-black mb-1.5"
              >
                MRP / Compare-at Price (₹)
              </label>
              <Input
                id="product-mrp"
                type="number"
                min="0"
                step="1"
                placeholder="Leave blank — no discount"
                error={errors.mrp?.message}
                {...register("mrp")}
              />
              <p className="text-[10px] font-sans text-[#888888] mt-1">
                Struck through beside the price to show the saving. Blank means no
                discount badge at all; it can never sit below the base price.
              </p>
            </div>
          </div>

          <div className="pt-1 space-y-4 border-t border-[#f0f0f0]">
            <Controller
              control={control}
              name="priceIncludesGst"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Price includes GST"
                  hint="Off means GST is added on top of the listed price at checkout."
                />
              )}
            />
            <Controller
              control={control}
              name="gstExempt"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Exclude GST on this product"
                  hint="No tax is charged on this piece at all."
                />
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="product-gst-rate"
                  className="block text-[11px] font-sans font-medium text-black mb-1.5"
                >
                  GST Rate Override (%)
                </label>
                <Input
                  id="product-gst-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="Auto (price slab)"
                  disabled={gstExempt}
                  error={errors.gstRate?.message}
                  {...register("gstRate")}
                />
                <p className="text-[10px] font-sans text-[#888888] mt-1">
                  Leave blank to use the store slab: 5% up to the threshold, 18% above.
                </p>
              </div>
              <div>
                <label
                  htmlFor="product-hsn"
                  className="block text-[11px] font-sans font-medium text-black mb-1.5"
                >
                  HSN Code
                </label>
                <Input
                  id="product-hsn"
                  placeholder="6204"
                  error={errors.hsnCode?.message}
                  {...register("hsnCode")}
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
              id="product-fabric"
              label="Fabric"
              placeholder="Chanderi silk"
              {...register("fabric")}
            />
            <LabelledInput
              id="product-material"
              label="Material"
              placeholder="Pure silk with zardozi work"
              {...register("material")}
            />
            <LabelledInput
              id="product-sleeve"
              label="Sleeve"
              placeholder="Three-quarter"
              {...register("sleeve")}
            />
            <LabelledInput
              id="product-neck"
              label="Neck"
              placeholder="Sweetheart"
              {...register("neck")}
            />
            <LabelledInput
              id="product-length"
              label="Length"
              placeholder="Floor length"
              {...register("length")}
            />
            <LabelledInput
              id="product-delivery-time"
              label="Delivery Time"
              placeholder="Ships in 2–4 weeks"
              {...register("deliveryTime")}
            />
          </div>

          <div>
            <label
              htmlFor="product-care"
              className="block text-[11px] font-sans font-medium text-black mb-1.5"
            >
              Care Instructions
            </label>
            <textarea
              id="product-care"
              rows={2}
              className={`${fieldClass} resize-none`}
              placeholder="Dry clean only. Store in muslin bag."
              {...register("careInstr")}
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
            {skus.map((sku, index) => {
              const out = (parseInt(sku.stock, 10) || 0) === 0;
              const rowErrors = errors.skus?.[index];
              return (
                <div
                  key={sku.tempId}
                  className={`grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_1.4fr_auto_auto] gap-2 bg-white border p-3 items-center ${
                    out ? "border-brand-wine/30" : "border-[#e0e0e0]"
                  }`}
                >
                  <Input
                    placeholder="S / M / 38"
                    aria-label="Size"
                    error={rowErrors?.size?.message}
                    {...register(`skus.${index}.size`)}
                  />
                  <Input
                    placeholder="Ivory"
                    aria-label="Colour"
                    {...register(`skus.${index}.color`)}
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="25000"
                    aria-label="Price"
                    error={rowErrors?.price?.message}
                    {...register(`skus.${index}.price`)}
                  />
                  <Input
                    type="number"
                    min="0"
                    aria-label="Stock"
                    {...register(`skus.${index}.stock`)}
                  />
                  <Input
                    type="number"
                    min="0"
                    aria-label="Low stock threshold"
                    {...register(`skus.${index}.lowStockAt`)}
                  />
                  <Input
                    placeholder="DS-001-S-IVY"
                    aria-label="SKU code"
                    error={rowErrors?.skuCode?.message}
                    {...register(`skus.${index}.skuCode`)}
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

        {/* `errors.skus.message` is the array-level "add at least one" rule; the
            per-row messages render inline above. */}
        {errors.skus?.message && (
          <p className="text-[11px] font-sans text-brand-wine mt-2">{errors.skus.message}</p>
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
                      onClick={() => setVideos(videos.filter((v) => v.tempId !== video.tempId))}
                      className="absolute top-1 right-1 z-10 bg-white/80 hover:bg-brand-wine hover:text-white text-[#888888] rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                      aria-label="Remove video"
                    >
                      <X size={10} />
                    </button>
                  </div>

                  <select
                    value={video.kind}
                    onChange={(e) =>
                      setVideos(
                        videos.map((v) =>
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
      {(formError || errors.images?.message || errors.videos?.message) && (
        <p className="text-[12px] font-sans text-brand-wine bg-brand-wine/5 border border-brand-wine/20 px-4 py-3">
          {formError || errors.images?.message || errors.videos?.message}
        </p>
      )}

      <div className="flex gap-4">
        <Button type="submit" loading={isSubmitting}>
          {mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Label + input pair. Forwards its ref so a `register(...)` spread reaches the
 * underlying `<input>` — without that, React Hook Form never sees the field.
 */
const LabelledInput = forwardRef<
  HTMLInputElement,
  { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>
>(({ label, id, ...props }, ref) => (
  <div>
    <label htmlFor={id} className="block text-[11px] font-sans font-medium text-black mb-1.5">
      {label}
    </label>
    <Input ref={ref} id={id} {...props} />
  </div>
));

LabelledInput.displayName = "LabelledInput";

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
