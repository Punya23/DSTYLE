"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { ProductCardData } from "@/lib/product-select";
import {
  readGuestHistory,
  pushGuestHistory,
  clearGuestHistory,
} from "@/lib/recently-viewed";

const KEY = ["recently-viewed"] as const;

async function fetchHistory(guestIds: string[], authed: boolean): Promise<ProductCardData[]> {
  // Signed in: the server owns the list. Guest: hand it our local IDs and let
  // the same endpoint hydrate them into full product cards.
  const url = authed
    ? "/api/recently-viewed"
    : `/api/recently-viewed?ids=${encodeURIComponent(guestIds.join(","))}`;
  if (!authed && guestIds.length === 0) return [];

  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.products ?? []) as ProductCardData[];
}

/**
 * Read the shopper's recently viewed products. Works signed-out (localStorage)
 * and signed-in (database), and hands the guest list over to the server once
 * they authenticate so nothing is lost at sign-in.
 */
export function useRecentlyViewed() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const qc = useQueryClient();
  const merged = useRef(false);

  useEffect(() => {
    if (!authed || merged.current) return;
    const guestIds = readGuestHistory();
    if (guestIds.length === 0) {
      merged.current = true;
      return;
    }
    merged.current = true;
    void fetch("/api/recently-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: guestIds }),
    })
      .then(() => {
        // The server list is now authoritative — drop the local copy so the
        // two can't drift apart on the next visit.
        clearGuestHistory();
        void qc.invalidateQueries({ queryKey: KEY });
      })
      .catch(() => undefined);
  }, [authed, qc]);

  const { data, isLoading } = useQuery({
    queryKey: [...KEY, authed],
    queryFn: () => fetchHistory(readGuestHistory(), authed),
    enabled: status !== "loading",
    staleTime: 60 * 1000,
  });

  return { products: data ?? [], isLoading };
}

/**
 * Record a product view. Always writes the guest list (cheap, and keeps the
 * history intact if the shopper signs out), and mirrors it to the server when
 * there's a session.
 */
export function useTrackProductView(productId: string | undefined) {
  const { status } = useSession();
  const qc = useQueryClient();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!productId || status === "loading") return;
    // Guard against re-running on every render or session refresh — one view
    // per product per mount is what we want.
    if (lastTracked.current === productId) return;
    lastTracked.current = productId;

    pushGuestHistory(productId);

    if (status === "authenticated") {
      void fetch("/api/recently-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      }).catch(() => undefined);
    }

    void qc.invalidateQueries({ queryKey: KEY });
  }, [productId, status, qc]);
}
