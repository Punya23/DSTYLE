"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  addItem: (item: CartItem) => void;
  removeItem: (skuId: string) => void;
  updateQuantity: (skuId: string, quantity: number) => void;
  clearCart: () => void;

  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (item) => {
        const existing = get().items.find((i) => i.skuId === item.skuId);
        if (existing) {
          const newQty = Math.min(
            existing.quantity + item.quantity,
            item.stock
          );
          set((s) => ({
            items: s.items.map((i) =>
              i.skuId === item.skuId ? { ...i, quantity: newQty } : i
            ),
            isOpen: true,
          }));
        } else {
          set((s) => ({ items: [...s.items, item], isOpen: true }));
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

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "dstyle-cart", skipHydration: true }
  )
);
