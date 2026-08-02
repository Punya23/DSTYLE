"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  /** Items parked for later. Mirrored to the server for signed-in shoppers. */
  saved: CartItem[];
  /** Coupon the shopper typed. Re-validated server-side on every quote. */
  couponCode: string | null;
  isOpen: boolean;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  addItem: (item: CartItem, options?: { silent?: boolean }) => void;
  removeItem: (skuId: string) => void;
  updateQuantity: (skuId: string, quantity: number) => void;
  clearCart: () => void;

  saveForLater: (skuId: string) => void;
  moveToCart: (skuId: string) => void;
  removeSaved: (skuId: string) => void;
  hydrateSaved: (items: CartItem[]) => void;

  applyCoupon: (code: string | null) => void;

  totalItems: () => number;
  /** Listed-price subtotal. Tax, shipping and discounts come from the server. */
  totalPrice: () => number;
}

/** Fire-and-forget server mirror — a failure never blocks the UI. */
function syncSaved(method: "POST" | "DELETE", body: Record<string, unknown>) {
  void fetch("/api/saved", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      saved: [],
      couponCode: null,
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (item, options) => {
        const open = !options?.silent;
        const existing = get().items.find((i) => i.skuId === item.skuId);
        if (existing) {
          const newQty = Math.min(existing.quantity + item.quantity, item.stock);
          set((s) => ({
            items: s.items.map((i) =>
              i.skuId === item.skuId ? { ...i, quantity: newQty } : i
            ),
            isOpen: open || s.isOpen,
          }));
        } else {
          set((s) => ({ items: [...s.items, item], isOpen: open || s.isOpen }));
        }
      },

      removeItem: (skuId) =>
        set((s) => ({ items: s.items.filter((i) => i.skuId !== skuId) })),

      updateQuantity: (skuId, quantity) => {
        if (quantity < 1) {
          get().removeItem(skuId);
          return;
        }
        set((s) => ({
          items: s.items.map((i) =>
            i.skuId === skuId
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [], couponCode: null }),

      /** Park a bag line: out of the cart, into "Saved for later". */
      saveForLater: (skuId) => {
        const item = get().items.find((i) => i.skuId === skuId);
        if (!item) return;
        set((s) => ({
          items: s.items.filter((i) => i.skuId !== skuId),
          saved: s.saved.some((i) => i.skuId === skuId) ? s.saved : [item, ...s.saved],
        }));
        syncSaved("POST", { skuId, quantity: item.quantity });
      },

      moveToCart: (skuId) => {
        const item = get().saved.find((i) => i.skuId === skuId);
        if (!item) return;
        set((s) => ({ saved: s.saved.filter((i) => i.skuId !== skuId) }));
        get().addItem(item, { silent: true });
        syncSaved("DELETE", { skuId });
      },

      removeSaved: (skuId) => {
        set((s) => ({ saved: s.saved.filter((i) => i.skuId !== skuId) }));
        syncSaved("DELETE", { skuId });
      },

      /**
       * Merge the server's saved list into the local one on sign-in. Local
       * entries win on conflict — they're the ones the shopper just touched.
       */
      hydrateSaved: (items) =>
        set((s) => {
          const seen = new Set(s.saved.map((i) => i.skuId));
          return { saved: [...s.saved, ...items.filter((i) => !seen.has(i.skuId))] };
        }),

      applyCoupon: (code) => set({ couponCode: code ? code.trim().toUpperCase() : null }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "dstyle-cart", skipHydration: true }
  )
);
