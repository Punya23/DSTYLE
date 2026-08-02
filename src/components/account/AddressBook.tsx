"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SavedAddress } from "@/lib/address";

type Draft = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
};

const EMPTY: Draft = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  isDefault: false,
};

function toDraft(address: SavedAddress): Draft {
  return {
    name: address.name,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    phone: address.phone,
    isDefault: address.isDefault,
  };
}

/**
 * Address book CRUD against /api/addresses. The server component owns the
 * initial list; every mutation re-renders it through `router.refresh()`.
 */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startAdd() {
    setEditingId(null);
    setDraft({ ...EMPTY, isDefault: addresses.length === 0 });
    setError(null);
  }

  function startEdit(address: SavedAddress) {
    setEditingId(address.id);
    setDraft(toDraft(address));
    setError(null);
  }

  function cancel() {
    setDraft(null);
    setEditingId(null);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;

    setBusy(true);
    setError(null);

    const res = await fetch(editingId ? `/api/addresses/${editingId}` : "/api/addresses", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Could not save this address.");
      return;
    }

    cancel();
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Could not remove this address.");
      return;
    }
    router.refresh();
  }

  async function makeDefault(address: SavedAddress) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/addresses/${address.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toDraft(address), isDefault: true }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not change the default address.");
      return;
    }
    router.refresh();
  }

  const field = (key: keyof Draft, label: string, extra?: Partial<React.ComponentProps<typeof Input>>) => (
    <Input
      id={`address-${key}`}
      label={label}
      value={String(draft?.[key] ?? "")}
      onChange={(e) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d))}
      {...extra}
    />
  );

  return (
    <div className="space-y-6">
      {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}

      {addresses.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="border border-brand-ivory-deep bg-white p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-[13px] font-sans font-medium text-black">{address.name}</p>
                {address.isDefault && <Badge variant="sand">Default</Badge>}
              </div>
              <address className="text-[12px] font-sans not-italic leading-relaxed text-[#666666]">
                {address.line1}
                {address.line2 ? (
                  <>
                    <br />
                    {address.line2}
                  </>
                ) : null}
                <br />
                {address.city}, {address.state} {address.pincode}
                <br />
                {address.phone}
              </address>

              <div className="mt-4 flex flex-wrap gap-4 border-t border-brand-ivory-deep pt-3">
                <button
                  type="button"
                  onClick={() => startEdit(address)}
                  className="text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
                >
                  Edit
                </button>
                {!address.isDefault && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => makeDefault(address)}
                      className="text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold disabled:opacity-40"
                    >
                      Set as default
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(address.id)}
                      className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] transition-colors hover:text-brand-wine disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <form onSubmit={save} className="max-w-xl space-y-4 border border-brand-ivory-deep bg-white p-6">
          <p className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
            {editingId ? "Edit address" : "New address"}
          </p>

          {field("name", "Full name", { required: true, maxLength: 120 })}
          {field("line1", "Address line 1", { required: true, maxLength: 200 })}
          {field("line2", "Address line 2", { maxLength: 200 })}

          <div className="grid gap-4 sm:grid-cols-2">
            {field("city", "City", { required: true, maxLength: 80 })}
            {field("state", "State", { required: true, maxLength: 80 })}
            {field("pincode", "PIN code", { required: true, inputMode: "numeric", maxLength: 6 })}
            {field("phone", "Phone", { required: true, type: "tel" })}
          </div>

          <label className="flex items-center gap-2 text-[11px] font-sans text-[#666666]">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(e) => setDraft((d) => (d ? { ...d, isDefault: e.target.checked } : d))}
              className="accent-brand-gold"
            />
            Use as my default delivery address
          </label>

          <div className="flex gap-3">
            <Button type="submit" size="sm" loading={busy}>
              {editingId ? "Save address" : "Add address"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={startAdd}>
          Add a new address
        </Button>
      )}
    </div>
  );
}
