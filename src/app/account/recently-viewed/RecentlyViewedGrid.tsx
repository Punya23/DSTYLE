"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { clearGuestHistory } from "@/lib/recently-viewed";
import { ProductCard } from "@/components/store/ProductCard";
import { AccountSection, EmptyState } from "@/components/account/AccountSection";
import { Spinner } from "@/components/ui/spinner";

export function RecentlyViewedGrid() {
  const { products, isLoading } = useRecentlyViewed();
  const qc = useQueryClient();
  const [clearing, setClearing] = useState(false);

  const clear = async () => {
    setClearing(true);
    try {
      await fetch("/api/recently-viewed", { method: "DELETE" });
      // The guest copy is separate storage — wipe both, or the list reappears
      // the moment the shopper signs out.
      clearGuestHistory();
      await qc.invalidateQueries({ queryKey: ["recently-viewed"] });
    } finally {
      setClearing(false);
    }
  };

  return (
    <AccountSection
      title="Recently Viewed"
      description="The last pieces you looked at, newest first."
      action={
        products.length > 0 ? (
          <button
            onClick={clear}
            disabled={clearing}
            className="text-[11px] font-sans tracking-luxe uppercase text-[#888888] transition-colors hover:text-brand-wine disabled:opacity-50"
          >
            {clearing ? "Clearing..." : "Clear History"}
          </button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="Nothing viewed yet"
          ctaHref="/collections"
          ctaLabel="Explore The Collections"
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      )}
    </AccountSection>
  );
}
