"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Bookmark, Heart, AlertTriangle } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CouponField, PriceBreakdown } from "@/components/store/PriceBreakdown";
import type { CartItem } from "@/types";

export function CartDrawer() {
  const {
    items,
    saved,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    saveForLater,
    moveToCart,
    removeSaved,
    hydrateSaved,
  } = useCartStore();

  const { quote, loading, couponError, problems } = useCartQuote();

  // Pull the signed-in shopper's parked items in once the drawer is opened.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch("/api/saved")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.items) && data.items.length > 0) {
          hydrateSaved(data.items as CartItem[]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, hydrateSaved]);

  const addToWishlist = (productId: string) => {
    void fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }).catch(() => {});
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={closeCart}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[440px] bg-brand-ivory flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-[72px] border-b border-brand-ivory-deep">
              <h2 className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
                Your Bag ({items.length})
              </h2>
              <button onClick={closeCart} className="p-1 text-black" aria-label="Close cart">
                <X size={20} />
              </button>
            </div>

            {items.length === 0 && saved.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
                <ShoppingBag size={40} strokeWidth={1} className="text-brand-champagne" />
                <p className="font-display italic text-2xl text-black">Your bag is empty</p>
                <p className="text-[11px] font-sans text-[#888] tracking-luxe uppercase">
                  Discover the collections
                </p>
                <Link href="/collections" onClick={closeCart}>
                  <Button variant="outline" size="sm">Continue Shopping</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  {items.map((item) => {
                    const problem = problems.find((p) => p.skuId === item.skuId);
                    return (
                      <div key={item.skuId} className="flex gap-4">
                        <Link
                          href={`/products/${item.productSlug}`}
                          onClick={closeCart}
                          className="relative h-24 w-20 shrink-0 bg-brand-ivory-deep overflow-hidden"
                        >
                          {item.image && (
                            <Image
                              src={item.image}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${item.productSlug}`} onClick={closeCart}>
                            <p className="text-[12px] font-sans font-medium text-black leading-snug line-clamp-2">
                              {item.productName}
                            </p>
                          </Link>
                          <p className="text-[11px] font-sans text-[#888888] mt-1 tracking-wide">
                            Size: {item.size}
                            {item.color && ` · ${item.color}`}
                          </p>

                          {/* Server-side stock truth, surfaced before checkout. */}
                          {problem && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-sans text-brand-wine leading-snug">
                              <AlertTriangle size={11} className="shrink-0" />
                              {problem.available === 0
                                ? "Just sold out"
                                : `Only ${problem.available} left`}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center border border-brand-ivory-deep bg-white">
                              <button
                                onClick={() => updateQuantity(item.skuId, item.quantity - 1)}
                                className="p-2 hover:bg-brand-ivory transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="px-3 text-[12px] font-sans font-medium min-w-[32px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.skuId, item.quantity + 1)}
                                disabled={item.quantity >= item.stock}
                                className="p-2 hover:bg-brand-ivory transition-colors disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <p className="text-[13px] font-sans font-medium text-black">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 mt-2.5">
                            <button
                              onClick={() => saveForLater(item.skuId)}
                              className="flex items-center gap-1.5 text-[10px] font-sans tracking-luxe uppercase text-[#888888] hover:text-black transition-colors"
                            >
                              <Bookmark size={11} /> Save for later
                            </button>
                            <button
                              onClick={() => {
                                addToWishlist(item.productId);
                                removeItem(item.skuId);
                              }}
                              className="flex items-center gap-1.5 text-[10px] font-sans tracking-luxe uppercase text-[#888888] hover:text-brand-gold-deep transition-colors"
                            >
                              <Heart size={11} /> Wishlist
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.skuId)}
                          className="self-start p-1 text-[#888888] hover:text-black transition-colors"
                          aria-label="Remove item"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Saved for later */}
                  {saved.length > 0 && (
                    <div className="pt-2 border-t border-brand-ivory-deep">
                      <p className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] pt-5 pb-4">
                        Saved for later ({saved.length})
                      </p>
                      <div className="space-y-4">
                        {saved.map((item) => (
                          <div key={item.skuId} className="flex gap-4">
                            <div className="relative h-16 w-14 shrink-0 bg-brand-ivory-deep overflow-hidden">
                              {item.image && (
                                <Image
                                  src={item.image}
                                  alt={item.productName}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-sans text-black leading-snug line-clamp-1">
                                {item.productName}
                              </p>
                              <p className="text-[11px] font-sans text-[#888888] mt-0.5">
                                {item.size} · {formatPrice(item.price)}
                              </p>
                              <div className="flex items-center gap-4 mt-1.5">
                                <button
                                  onClick={() => moveToCart(item.skuId)}
                                  disabled={item.stock === 0}
                                  className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold-deep hover:text-black transition-colors disabled:opacity-40"
                                >
                                  {item.stock === 0 ? "Sold out" : "Move to bag"}
                                </button>
                                <button
                                  onClick={() => removeSaved(item.skuId)}
                                  className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] hover:text-brand-wine transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                  <div className="border-t border-brand-ivory-deep bg-white px-6 py-5 space-y-4">
                    <CouponField error={couponError} applied={quote.coupon} />
                    <PriceBreakdown quote={quote} loading={loading} />
                    <Link href="/checkout" onClick={closeCart} className="block w-full">
                      <Button className="w-full" size="lg">Proceed to Checkout</Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
