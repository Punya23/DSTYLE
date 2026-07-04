"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { SKU, ProductImage } from "@/types";

const WHATSAPP = "919876543210";

interface ProductActionsProps {
  productId: string;
  productName: string;
  productSlug: string;
  primaryImage: ProductImage | undefined;
  skus: SKU[];
  isActive?: boolean;
}

export function ProductActions({
  productId,
  productName,
  productSlug,
  primaryImage,
  skus,
  isActive = true,
}: ProductActionsProps) {
  const [selectedSize, setSelectedSize] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const { addItem, openCart } = useCartStore();
  const openStylistWith = useUIStore((s) => s.openStylistWith);

  const selectedSku = skus.find((s) => s.size === selectedSize);
  const uniqueSizes = Array.from(new Set(skus.map((s) => s.size)));
  const isSoldOut = skus.every((s) => s.stock === 0);
  const minPrice = Math.min(...skus.map((s) => s.price));

  const whatsappMessage = (intent: "prebook" | "appointment") => {
    const sizeLine = selectedSize ? `Size: ${selectedSize}` : "Size: To be confirmed";
    const prefix =
      intent === "prebook"
        ? `Hi Dstyle, I'd like to pre-book:\n\n*${productName}*`
        : `Hi Dstyle, I'd like to book an atelier appointment for:\n\n*${productName}*`;
    return encodeURIComponent(`${prefix}\n${sizeLine}\n\nPlease share next steps.`);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      setError("Please select a size");
      return;
    }
    if (!selectedSku || selectedSku.stock === 0) {
      setError("This size is out of stock — try pre-book instead");
      return;
    }

    addItem({
      skuId: selectedSku.id,
      productId,
      productName,
      productSlug,
      image: primaryImage?.url ?? "",
      size: selectedSku.size,
      color: selectedSku.color,
      price: selectedSku.price,
      quantity: 1,
      stock: selectedSku.stock,
    });

    setAdded(true);
    setError("");
    openCart();
    setTimeout(() => setAdded(false), 2000);
  };

  const handlePreBook = () => {
    if (!selectedSize) {
      setError("Please select a size first");
      return;
    }
    window.open(`https://wa.me/${WHATSAPP}?text=${whatsappMessage("prebook")}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-3xl sm:text-4xl text-black">
          {selectedSku ? formatPrice(selectedSku.price) : formatPrice(minPrice)}
          {!selectedSku && skus.length > 1 && (
            <span className="font-sans text-sm text-[#888888] ml-2">onwards</span>
          )}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
            Select Size
            {selectedSize && (
              <span className="text-[#888888] ml-2 normal-case font-normal tracking-normal">
                — {selectedSize}
              </span>
            )}
          </span>
          <button
            type="button"
            className="text-[11px] font-sans text-[#888888] hover:text-black transition-colors underline underline-offset-2 min-h-[44px] px-1"
          >
            Size Guide
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {uniqueSizes.map((size) => {
            const sku = skus.find((s) => s.size === size);
            const lowStock = sku && sku.stock > 0 && sku.stock <= 3;

            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(size);
                  setError("");
                }}
                className={`min-h-[48px] min-w-[48px] px-4 text-[12px] font-sans font-medium border transition-all duration-300 ${
                  selectedSize === size
                    ? "border-brand-ink bg-brand-ink text-white"
                    : !sku || sku.stock === 0
                      ? "border-brand-ivory-deep text-[#bbb]"
                      : "border-brand-ivory-deep text-black hover:border-brand-gold active:bg-brand-ivory"
                }`}
              >
                {size}
                {lowStock && selectedSize !== size && (
                  <span className="block text-[8px] font-normal tracking-wide opacity-60">Low</span>
                )}
              </button>
            );
          })}
        </div>

        {selectedSku && selectedSku.stock > 0 && selectedSku.stock <= 3 && (
          <p className="mt-2.5 text-[11px] font-sans text-[#888888]">
            Only {selectedSku.stock} left in this size
          </p>
        )}
        {selectedSku && selectedSku.stock === 0 && (
          <p className="mt-2.5 text-[11px] font-sans text-[#888888]">
            Unavailable in this size — pre-book to reserve
          </p>
        )}
      </div>

      {error && <p className="text-[12px] font-sans text-brand-wine">{error}</p>}

      {!isActive && (
        <Badge variant="sand" className="w-full justify-center py-2.5 text-[10px] tracking-[0.2em]">
          Coming Soon — Pre-Book Available
        </Badge>
      )}

      {isActive && !isSoldOut && (
        <Button className="w-full min-h-[52px] text-[11px]" size="lg" onClick={handleAddToCart}>
          {added ? "Added to Bag ✓" : "Add to Bag"}
        </Button>
      )}

      {isSoldOut && isActive && (
        <Badge variant="red" className="w-full justify-center py-2.5 text-[10px]">
          Sold Out — Pre-Book Instead
        </Badge>
      )}

      <Button
        variant="outline"
        className="w-full min-h-[52px] text-[11px]"
        size="lg"
        onClick={handlePreBook}
      >
        Pre-Book This Piece
      </Button>

      <Button
        variant="sand"
        className="w-full min-h-[52px] text-[11px]"
        size="lg"
        onClick={() => setAppointmentOpen(true)}
      >
        Book Atelier Appointment
      </Button>

      <button
        type="button"
        onClick={() =>
          openStylistWith(
            `How should I style the ${productName}? What accessories or occasions would suit it?`
          )
        }
        className="w-full flex items-center justify-center gap-2 py-1 text-[11px] font-sans tracking-luxe uppercase text-brand-gold hover:text-brand-gold-deep transition-colors"
      >
        <Sparkles size={13} />
        Ask the Stylist about this piece
      </button>

      <p className="text-[11px] font-sans text-[#888888] text-center leading-relaxed">
        Free shipping above ₹5,000 · Couture may require 2–4 weeks
      </p>

      <Modal
        open={appointmentOpen}
        onClose={() => setAppointmentOpen(false)}
        title="Book Atelier Appointment"
        size="sm"
      >
        <p className="font-sans text-[14px] text-[#888888] leading-relaxed mb-4">
          Private consultation for <span className="text-black">{productName}</span>
          {selectedSize ? ` in size ${selectedSize}` : ""}.
        </p>
        <ul className="space-y-2 text-[13px] font-sans text-[#888888] mb-6">
          <li>· Fitting & styling consultation</li>
          <li>· Custom alterations discussion</li>
          <li>· Bridal & couture enquiries</li>
        </ul>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full min-h-[48px]"
            onClick={() => {
              window.open(`https://wa.me/${WHATSAPP}?text=${whatsappMessage("appointment")}`, "_blank");
              setAppointmentOpen(false);
            }}
          >
            Continue on WhatsApp
          </Button>
          <Link href="/about" onClick={() => setAppointmentOpen(false)}>
            <Button variant="outline" className="w-full min-h-[48px]">
              About the Atelier
            </Button>
          </Link>
        </div>
      </Modal>
    </div>
  );
}

/** Sticky mobile bar — opens full purchase sheet */
export function ProductMobileBar(props: ProductActionsProps) {
  const [open, setOpen] = useState(false);
  const minPrice = Math.min(...props.skus.map((s) => s.price));

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-brand-ivory/95 backdrop-blur-md border-t border-brand-ivory-deep shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-display text-base text-black truncate leading-tight">
              {props.productName}
            </p>
            <p className="font-sans text-[12px] text-[#888888] mt-0.5">
              {formatPrice(minPrice)} onwards
            </p>
          </div>
          <Button className="shrink-0 min-h-[48px] px-5 text-[10px]" onClick={() => setOpen(true)}>
            Select Size
          </Button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={props.productName} size="md">
        <ProductActions {...props} />
      </Modal>
    </>
  );
}
