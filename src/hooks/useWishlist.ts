"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const KEY = ["wishlist"] as const;

/**
 * Client wishlist state backed by the DB (`/api/wishlist`). Reads once and
 * shares the cache across every ProductCard via React Query; mutations are
 * optimistic. Returns an empty set when logged out.
 */
export function useWishlist() {
  const { status } = useSession();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<string[]> => {
      const res = await fetch("/api/wishlist");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.productIds ?? []) as string[];
    },
    enabled: status === "authenticated",
    staleTime: 60 * 1000,
  });

  const ids = new Set(data ?? []);

  const mutation = useMutation({
    mutationFn: async ({ productId, active }: { productId: string; active: boolean }) => {
      await fetch("/api/wishlist", {
        method: active ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    },
    onMutate: async ({ productId, active }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<string[]>(KEY) ?? [];
      qc.setQueryData<string[]>(
        KEY,
        active ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    isWishlisted: (productId: string) => ids.has(productId),
    toggle: (productId: string) => mutation.mutate({ productId, active: ids.has(productId) }),
  };
}
