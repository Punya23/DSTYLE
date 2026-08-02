"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreConfig } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Tax and shipping rules. Changing these affects every future quote; existing
 * orders keep the figures snapshotted at the time they were placed.
 */
export function StoreSettingsForm({ initial }: { initial: StoreConfig }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const num = (key: keyof StoreConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (parseFloat(e.target.value) || 0) as never);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-10 pb-16">
      <section>
        <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
          GST
        </h2>
        <div className="bg-white border border-[#e0e0e0] p-6 space-y-5">
          <Toggle
            checked={form.gstEnabled}
            onChange={(v) => set("gstEnabled", v)}
            label="Charge GST"
            hint="Turn off to sell without any tax line."
          />
          <Toggle
            checked={form.pricesIncludeGst}
            onChange={(v) => set("pricesIncludeGst", v)}
            label="Listed prices include GST"
            hint="Default for new products. Each product can override this on its own page."
          />

          <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-4", !form.gstEnabled && "opacity-50")}>
            <Input
              label="Low rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.gstLowRate}
              onChange={num("gstLowRate")}
              disabled={!form.gstEnabled}
            />
            <Input
              label="High rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.gstHighRate}
              onChange={num("gstHighRate")}
              disabled={!form.gstEnabled}
            />
            <Input
              label="Slab threshold (₹)"
              type="number"
              min="0"
              step="100"
              value={form.gstSlabThreshold}
              onChange={num("gstSlabThreshold")}
              disabled={!form.gstEnabled}
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
              label="Flat rate (₹)"
              type="number"
              min="0"
              step="10"
              value={form.shippingFlat}
              onChange={num("shippingFlat")}
            />
            <Input
              label="Free above (₹)"
              type="number"
              min="0"
              step="100"
              value={form.freeShippingThreshold}
              onChange={num("freeShippingThreshold")}
            />
            <Input
              label="COD fee (₹)"
              type="number"
              min="0"
              step="10"
              value={form.codFee}
              onChange={num("codFee")}
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
        <Button type="submit" loading={saving}>
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
        <span
          className={cn(
            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
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
