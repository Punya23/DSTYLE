"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreConfig } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { storeSettingsSchema, type StoreSettingsInput } from "@/lib/account-schemas";

/**
 * Tax and shipping rules. Changing these affects every future quote; existing
 * orders keep the figures snapshotted at the time they were placed.
 */
export function StoreSettingsForm({ initial }: { initial: StoreConfig }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StoreSettingsInput>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: initial,
  });

  // The GST rate inputs dim and disable when GST is switched off. `useWatch`
  // rather than `watch` — the latter returns a fresh function each render, which
  // makes the React Compiler skip memoizing the whole component.
  const gstEnabled = useWatch({ control, name: "gstEnabled" });

  const handleSave = async (values: StoreSettingsInput) => {
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings.");
        return;
      }
      setSaved(true);
      // Re-seed from the server's copy, which is authoritative after the write.
      reset(data.settings ?? values);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  /**
   * `valueAsNumber` yields NaN for an empty input, which fails the schema with an
   * unhelpful message. Coercing the blank case to 0 keeps the field usable while
   * still letting the min/max rules do their job.
   */
  const numeric = (name: keyof StoreSettingsInput) =>
    register(name, {
      setValueAs: (v) => (v === "" || v === null ? 0 : Number(v)),
    });

  return (
    <form onSubmit={handleSubmit(handleSave)} className="max-w-2xl space-y-10 pb-16" noValidate>
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          GST
        </h2>
        <div className="bg-white border border-[#e0e0e0] p-6 space-y-5">
          {/* The switches aren't `<input>`s, so they go through `Controller`. */}
          <Controller
            control={control}
            name="gstEnabled"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Charge GST"
                hint="Turn off to sell without any tax line."
              />
            )}
          />
          <Controller
            control={control}
            name="pricesIncludeGst"
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Listed prices include GST"
                hint="Default for new products. Each product can override this on its own page."
              />
            )}
          />

          <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4", !gstEnabled && "opacity-50")}>
            <Input
              id="gst-low-rate"
              label="Low rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              disabled={!gstEnabled}
              error={errors.gstLowRate?.message}
              {...numeric("gstLowRate")}
            />
            <Input
              id="gst-high-rate"
              label="High rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              disabled={!gstEnabled}
              error={errors.gstHighRate?.message}
              {...numeric("gstHighRate")}
            />
            <Input
              id="gst-slab-threshold"
              label="Slab threshold (₹)"
              type="number"
              min="0"
              step="100"
              disabled={!gstEnabled}
              error={errors.gstSlabThreshold?.message}
              {...numeric("gstSlabThreshold")}
            />
          </div>
          <p className="text-[11px] font-sans text-[#888888] leading-relaxed">
            Indian apparel GST is slab-based on the per-piece price: items up to the threshold are
            taxed at the low rate, everything above at the high rate.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          Shipping
        </h2>
        <div className="bg-white border border-[#e0e0e0] p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              id="shipping-flat"
              label="Flat rate (₹)"
              type="number"
              min="0"
              step="10"
              error={errors.shippingFlat?.message}
              {...numeric("shippingFlat")}
            />
            <Input
              id="free-shipping-threshold"
              label="Free above (₹)"
              type="number"
              min="0"
              step="100"
              error={errors.freeShippingThreshold?.message}
              {...numeric("freeShippingThreshold")}
            />
            <Input
              id="cod-fee"
              label="COD fee (₹)"
              type="number"
              min="0"
              step="10"
              error={errors.codFee?.message}
              {...numeric("codFee")}
            />
          </div>
          <p className="text-[11px] font-sans text-[#888888]">
            The free-shipping threshold is checked against the subtotal after any discount.
          </p>
        </div>
      </section>

      {error && (
        <p className="text-[12px] font-sans text-brand-wine bg-brand-wine/5 border border-brand-wine/20 px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" loading={isSubmitting}>
          Save Settings
        </Button>
        {saved && (
          <span className="text-[11px] font-sans text-brand-gold-deep tracking-luxe uppercase">
            Saved
          </span>
        )}
      </div>
    </form>
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
        className={cn(
          "relative shrink-0 mt-0.5 w-10 h-5 rounded-full transition-colors",
          checked ? "bg-brand-ink" : "bg-brand-ivory-deep"
        )}
      >
        {/* `left-0.5` is load-bearing: without a left anchor an absolutely
            positioned box falls back to its *static* position (here 20px in),
            and the checked translate then stacked on top of that — putting the
            knob outside the 40px track and over the first letter of the label. */}
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      <span>
        <span className="block text-[12px] font-sans text-black">{label}</span>
        {hint && <span className="block text-[11px] font-sans text-[#888888] mt-0.5">{hint}</span>}
      </span>
    </div>
  );
}
