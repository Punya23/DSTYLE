"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCartStore } from "@/store/cart";
import { computeQuote, DEFAULT_STORE_CONFIG, type Quote } from "@/lib/pricing";
import type { CartItem } from "@/types";

/**
 * Live, server-priced cart totals.
 *
 * The bag itself lives in localStorage, so the first paint is instant but
 * knows nothing about GST, shipping rules or whether a coupon is still valid.
 * This hook posts the bag to `/api/cart/quote` and swaps in the authoritative
 * figures; until the answer lands it renders an optimistic local estimate, so
 * the summary never flashes empty.
 */

export interface StockProblem {
  skuId: string;
  name: string;
  size: string;
  available: number;
}

export interface UseCartQuoteResult {
  quote: Quote;
  /** True while the server figure is still in flight. */
  loading: boolean;
  /** Set when the applied coupon was rejected. */
  couponError: string | null;
  problems: StockProblem[];
  /** True once the server has priced this exact bag. */
  settled: boolean;
  refresh: () => void;
}

interface ServerQuote {
  /** The bag this response was computed for — stale answers are ignored. */
  key: string;
  quote: Quote;
  problems: StockProblem[];
  couponError: string | null;
}

/** Optimistic totals from local data alone. */
function localEstimate(items: CartItem[], paymentMethod: "razorpay" | "cod"): Quote {
  return computeQuote({
    lines: items.map((i) => ({
      skuId: i.skuId,
      productId: i.productId,
      unitPrice: i.price,
      quantity: i.quantity,
    })),
    config: DEFAULT_STORE_CONFIG,
    paymentMethod,
  });
}

export function useCartQuote(
  paymentMethod: "razorpay" | "cod" = "razorpay"
): UseCartQuoteResult {
  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);

  const [server, setServer] = useState<ServerQuote | null>(null);
  /** Bag key whose pricing request failed — stops the spinner from hanging. */
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Only the newest response may write state — quantity taps fire fast.
  const requestId = useRef(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Identifies exactly what was priced, so a response can be matched to the
  // bag it belongs to rather than blindly applied.
  const key = `${items.map((i) => `${i.skuId}:${i.quantity}`).join("|")}#${
    couponCode ?? ""
  }#${paymentMethod}`;

  const estimate = useMemo(
    () => localEstimate(items, paymentMethod),
    // `key` covers the item list; `items` is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  useEffect(() => {
    if (items.length === 0) return;

    const id = ++requestId.current;
    const controller = new AbortController();

    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        items: items.map((i) => ({ skuId: i.skuId, quantity: i.quantity })),
        couponCode,
        paymentMethod,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (id !== requestId.current || !data?.quote) return;
        setServer({
          key,
          quote: data.quote as Quote,
          problems: (data.problems ?? []) as StockProblem[],
          couponError: (data.couponError ?? null) as string | null,
        });
      })
      .catch(() => {
        // Offline or server error — the local estimate stays on screen, and
        // the bag stops rendering as "pricing…" forever.
        if (id === requestId.current) setFailedKey(key);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  // A server answer only counts while it still describes the current bag.
  const fresh = server?.key === key ? server : null;
  const loading = items.length > 0 && fresh === null && failedKey !== key;

  return {
    quote: fresh?.quote ?? estimate,
    loading,
    couponError: fresh?.couponError ?? null,
    problems: fresh?.problems ?? [],
    settled: fresh !== null || items.length === 0,
    refresh,
  };
}
