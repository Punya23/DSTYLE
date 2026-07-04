"use client";

import { create } from "zustand";

interface AuthModalStore {
  isOpen: boolean;
  callbackUrl?: string;
  open: (callbackUrl?: string) => void;
  close: () => void;
}

/** Global control for the sign-in modal, openable from nav, checkout, etc. */
export const useAuthModal = create<AuthModalStore>((set) => ({
  isOpen: false,
  callbackUrl: undefined,
  open: (callbackUrl) => set({ isOpen: true, callbackUrl }),
  close: () => set({ isOpen: false }),
}));
