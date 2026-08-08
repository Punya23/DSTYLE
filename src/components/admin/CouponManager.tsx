"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  couponSummary,
  couponFormSchema,
  couponFormToPayload,
  type CouponFormInput,
} from "@/lib/coupon-schema";
import { formatPrice, cn } from "@/lib/utils";

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING" | "BUY_X_GET_Y";
  value: number;
  maxDiscount: number | null;
  minOrder: number | null;
  buyQty: number | null;
  getQty: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usageCount: number;
  isActive: boolean;
  firstOrderOnly: boolean;
}

const TYPE_LABELS: Record<AdminCoupon["type"], string> = {
  PERCENT: "% off",
  FIXED: "₹ off",
  FREE_SHIPPING: "Free shipping",
  BUY_X_GET_Y: "Buy X get Y",
};

/**
 * Form state is all strings — a half-typed number field has no numeric value.
 * The shape and its validation live in `coupon-schema` so the API shares them.
 */
const BLANK: CouponFormInput = {
  code: "",
  description: "",
  type: "PERCENT",
  value: "",
  maxDiscount: "",
  minOrder: "",
  buyQty: "2",
  getQty: "1",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perUserLimit: "1",
  isActive: true,
  firstOrderOnly: false,
};

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toForm(coupon: AdminCoupon): CouponFormInput {
  return {
    code: coupon.code,
    description: coupon.description ?? "",
    type: coupon.type,
    value: coupon.value ? String(coupon.value) : "",
    maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
    minOrder: coupon.minOrder != null ? String(coupon.minOrder) : "",
    buyQty: coupon.buyQty != null ? String(coupon.buyQty) : "2",
    getQty: coupon.getQty != null ? String(coupon.getQty) : "1",
    startsAt: toLocalInput(coupon.startsAt),
    expiresAt: toLocalInput(coupon.expiresAt),
    usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
    perUserLimit: coupon.perUserLimit != null ? String(coupon.perUserLimit) : "",
    isActive: coupon.isActive,
    firstOrderOnly: coupon.firstOrderOnly,
  };
}

export function CouponManager({ initial }: { initial: AdminCoupon[] }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initial);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormInput>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: BLANK,
  });

  // Which fields are relevant depends on the discount type. `useWatch` rather
  // than `watch` — the latter returns a fresh function each render, which makes
  // the React Compiler skip memoizing the whole component.
  const type = useWatch({ control, name: "type" });

  const startCreate = () => {
    setEditing(null);
    reset(BLANK);
    setError("");
    setOpen(true);
  };

  const startEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    reset(toForm(coupon));
    setError("");
    setOpen(true);
  };

  const handleSave = async (form: CouponFormInput) => {
    setError("");

    try {
      const res = await fetch(
        editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(couponFormToPayload(form)),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the coupon.");
        return;
      }
      setOpen(false);
      router.refresh();
      // Optimistic local update so the row reflects the edit before the
      // server component re-renders.
      const saved = { ...data.coupon, value: Number(data.coupon.value) } as AdminCoupon;
      setCoupons((prev) =>
        editing ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]
      );
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const handleDelete = async (coupon: AdminCoupon) => {
    const used = coupon.usageCount > 0;
    const confirmed = window.confirm(
      used
        ? `${coupon.code} has been redeemed ${coupon.usageCount} time(s), so it will be deactivated rather than deleted. Continue?`
        : `Delete ${coupon.code}? This cannot be undone.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
    if (!res.ok) return;

    const data = await res.json();
    setCoupons((prev) =>
      data.deactivated
        ? prev.map((c) => (c.id === coupon.id ? { ...c, isActive: false } : c))
        : prev.filter((c) => c.id !== coupon.id)
    );
    router.refresh();
  };

  const needsValue = type === "PERCENT" || type === "FIXED";

  return (
    <>
      <div className="flex items-center justify-end mb-5">
        <Button size="sm" onClick={startCreate}>
          <Plus size={13} className="mr-1.5" /> New Coupon
        </Button>
      </div>

      <div className="bg-white border border-[#e0e0e0] overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <thead className="border-b border-[#e0e0e0]">
            <tr>
              {["Code", "Discount", "Conditions", "Window", "Used", "Status", ""].map((h) => (
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
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <Tag size={22} className="mx-auto mb-3 text-brand-champagne" />
                  <p className="text-[12px] font-sans text-[#888888]">
                    No coupons yet. Create FIRST10, WELCOME20 or a festive code to get started.
                  </p>
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => {
                const expired =
                  coupon.expiresAt != null && new Date(coupon.expiresAt) <= new Date();
                const exhausted =
                  coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit;

                return (
                  <tr key={coupon.id} className="border-b border-[#f5f5f5] hover:bg-[#fafafa]">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-mono font-medium text-black tracking-wide">
                        {coupon.code}
                      </p>
                      {coupon.description && (
                        <p className="text-[10px] font-sans text-[#888888] mt-0.5 line-clamp-1">
                          {coupon.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-sans text-black">
                      {couponSummary(coupon)}
                      {coupon.maxDiscount != null && (
                        <span className="block text-[10px] text-[#888888]">
                          max {formatPrice(coupon.maxDiscount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-sans text-[#888888] space-y-0.5">
                      {coupon.minOrder != null && <p>Min {formatPrice(coupon.minOrder)}</p>}
                      {coupon.perUserLimit != null && <p>{coupon.perUserLimit}× per customer</p>}
                      {coupon.firstOrderOnly && <p>First order only</p>}
                      {coupon.minOrder == null &&
                        coupon.perUserLimit == null &&
                        !coupon.firstOrderOnly && <p>—</p>}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-sans text-[#888888]">
                      {coupon.expiresAt ? (
                        <span className={cn(expired && "text-brand-wine")}>
                          till {new Date(coupon.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </span>
                      ) : (
                        "No expiry"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-sans text-black">
                      {coupon.usageCount}
                      {coupon.usageLimit != null && (
                        <span className="text-[#888888]"> / {coupon.usageLimit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!coupon.isActive ? (
                        <Badge variant="outline">Inactive</Badge>
                      ) : expired ? (
                        <Badge variant="red">Expired</Badge>
                      ) : exhausted ? (
                        <Badge variant="red">Used up</Badge>
                      ) : (
                        <Badge variant="sand">Live</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(coupon)}
                          className="p-1.5 text-[#888888] hover:text-black transition-colors"
                          aria-label={`Edit ${coupon.code}`}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          className="p-1.5 text-[#888888] hover:text-brand-wine transition-colors"
                          aria-label={`Delete ${coupon.code}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.code}` : "New Coupon"}
        size="lg"
      >
        <form onSubmit={handleSubmit(handleSave)} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="coupon-code"
              label="Code"
              placeholder="FIRST10"
              error={errors.code?.message}
              {...register("code", {
                // Codes are matched case-insensitively server-side, but showing
                // them uppercase as you type matches how they're displayed.
                setValueAs: (v: string) => v.toUpperCase(),
              })}
            />
            <div className="flex flex-col gap-2">
              <label
                htmlFor="coupon-type"
                className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink"
              >
                Discount Type
              </label>
              <select
                id="coupon-type"
                className="w-full border border-brand-ivory-deep bg-white px-4 py-3 text-sm font-sans text-brand-ink focus:border-brand-gold focus:outline-none"
                {...register("type")}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            id="coupon-description"
            label="Description"
            placeholder="10% off your first order"
            error={errors.description?.message}
            {...register("description")}
          />

          {needsValue && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="coupon-value"
                label={type === "PERCENT" ? "Percent Off" : "Rupees Off"}
                type="number"
                min="0"
                step={type === "PERCENT" ? "1" : "10"}
                placeholder={type === "PERCENT" ? "10" : "500"}
                error={errors.value?.message}
                {...register("value")}
              />
              {type === "PERCENT" && (
                <Input
                  id="coupon-max-discount"
                  label="Max Discount (₹)"
                  type="number"
                  min="0"
                  placeholder="Uncapped"
                  error={errors.maxDiscount?.message}
                  {...register("maxDiscount")}
                />
              )}
            </div>
          )}

          {type === "BUY_X_GET_Y" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="coupon-buy-qty"
                label="Buy Quantity"
                type="number"
                min="1"
                error={errors.buyQty?.message}
                {...register("buyQty")}
              />
              <Input
                id="coupon-get-qty"
                label="Free Quantity"
                type="number"
                min="1"
                error={errors.getQty?.message}
                {...register("getQty")}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              id="coupon-min-order"
              label="Min Order (₹)"
              type="number"
              min="0"
              placeholder="None"
              error={errors.minOrder?.message}
              {...register("minOrder")}
            />
            <Input
              id="coupon-usage-limit"
              label="Total Uses"
              type="number"
              min="1"
              placeholder="Unlimited"
              error={errors.usageLimit?.message}
              {...register("usageLimit")}
            />
            <Input
              id="coupon-per-user-limit"
              label="Uses Per Customer"
              type="number"
              min="1"
              placeholder="Unlimited"
              error={errors.perUserLimit?.message}
              {...register("perUserLimit")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="coupon-starts-at"
              label="Starts"
              type="datetime-local"
              error={errors.startsAt?.message}
              {...register("startsAt")}
            />
            <Input
              id="coupon-expires-at"
              label="Expires"
              type="datetime-local"
              error={errors.expiresAt?.message}
              {...register("expiresAt")}
            />
          </div>

          <div className="flex flex-wrap gap-8 pt-1">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <CheckToggle checked={field.value} onChange={field.onChange} label="Active" />
              )}
            />
            <Controller
              control={control}
              name="firstOrderOnly"
              render={({ field }) => (
                <CheckToggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="First order only"
                />
              )}
            />
          </div>

          {error && (
            <p className="text-[12px] font-sans text-brand-wine bg-brand-wine/5 border border-brand-wine/20 px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save Changes" : "Create Coupon"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function CheckToggle({
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
        className={cn(
          "relative w-10 h-5 rounded-full transition-colors",
          checked ? "bg-brand-ink" : "bg-brand-ivory-deep"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
      <span className="text-[12px] font-sans text-black">{label}</span>
    </label>
  );
}
