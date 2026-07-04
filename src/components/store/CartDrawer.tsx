"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice } =
    useCartStore();

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
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px] bg-brand-ivory flex flex-col"
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

            {/* Items */}
            {items.length === 0 ? (
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
                  {items.map((item) => (
                    <div key={item.skuId} className="flex gap-4">
                      <Link
                        href={`/products/${item.productSlug}`}
                        onClick={closeCart}
                        className="relative h-24 w-20 shrink-0 bg-brand-ivory-deep overflow-hidden"
                      >
                        <Image
                          src={item.image}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${item.productSlug}`}
                          onClick={closeCart}
                        >
                          <p className="text-[12px] font-sans font-medium text-black leading-snug line-clamp-2">
                            {item.productName}
                          </p>
                        </Link>
                        <p className="text-[11px] font-sans text-[#888888] mt-1 tracking-wide">
                          Size: {item.size}
                          {item.color && ` · ${item.color}`}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-brand-ivory-deep bg-white">
                            <button
                              onClick={() =>
                                updateQuantity(item.skuId, item.quantity - 1)
                              }
                              className="p-2 hover:bg-brand-ivory transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-3 text-[12px] font-sans font-medium min-w-[32px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.skuId, item.quantity + 1)
                              }
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
                      </div>
                      <button
                        onClick={() => removeItem(item.skuId)}
                        className="self-start p-1 text-[#888888] hover:text-black transition-colors"
                        aria-label="Remove item"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-brand-ivory-deep bg-white px-6 py-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-sans text-[#888] tracking-luxe uppercase">
                      Subtotal
                    </span>
                    <span className="font-display text-xl text-black">
                      {formatPrice(totalPrice())}
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-[#888888]">
                    Taxes and shipping calculated at checkout
                  </p>
                  <Link href="/checkout" onClick={closeCart} className="w-full">
                    <Button className="w-full" size="lg">Proceed to Checkout</Button>
                  </Link>
                  <Link href="/collections" onClick={closeCart} className="w-full">
                    <Button variant="ghost" className="w-full" size="sm">Continue Shopping</Button>
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
