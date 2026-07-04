"use client";

import { create } from "zustand";

interface UIStore {
  searchOpen: boolean;
  stylistOpen: boolean;
  /** A message to auto-send when the stylist opens (e.g. from a product page). */
  stylistSeed: string | null;
  openSearch: () => void;
  closeSearch: () => void;
  openStylist: () => void;
  openStylistWith: (message: string) => void;
  closeStylist: () => void;
  toggleStylist: () => void;
  clearStylistSeed: () => void;
}

/** Global open-state for the search overlay and the AI stylist concierge. */
export const useUIStore = create<UIStore>((set) => ({
  searchOpen: false,
  stylistOpen: false,
  stylistSeed: null,
  openSearch: () => set({ searchOpen: true, stylistOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  openStylist: () => set({ stylistOpen: true, searchOpen: false }),
  openStylistWith: (message) =>
    set({ stylistOpen: true, searchOpen: false, stylistSeed: message }),
  closeStylist: () => set({ stylistOpen: false }),
  toggleStylist: () => set((s) => ({ stylistOpen: !s.stylistOpen })),
  clearStylistSeed: () => set({ stylistSeed: null }),
}));
