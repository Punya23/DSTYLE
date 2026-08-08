"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Heart, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { SizeGuide } from "@/components/product/SizeGuide";
import { useCartStore } from "@/store/cart";
import { useUIStore } from "@/store/ui";
import { useWishlist } from "@/hooks/useWishlist";
import { availabilityFor, fromPrice, isSoldOut } from "@/lib/inventory";
import { discountPercent } from "@/lib/pricing";
import { formatPrice, cn } from "@/lib/utils";
import type { SKU, ProductImage } from "@/types";

const WHATSAPP = "919876543210";

interface ProductActionsProps {
  productId: string;
  productName: string;
  productSlug: string;
  primaryImage: ProductImage | undefined;
  skus: SKU[];
  isActive?: boolean;
  /** Free-text dispatch promise from the product record. */
  deliveryTime?: string | null;
  /** Product.mrp — the compare-at price. Null means no discount is shown. */
  mrp?: number | null;
  /** StoreSetting.freeShippingThreshold, for the footnote under the buttons. */
  freeShippingThreshold: number;
  /**
   * Render the price inside this panel. The desktop PDP prints its own price
   * row under the title, so only the mobile purchase sheet asks for one.
   */
  showPrice?: boolean;
}

export function ProductActions({
  productId,
  productName,
  productSlug,
  primaryImage,
  skus,
  isActive = true,
  deliveryTime,
  mrp,
  freeShippingThreshold,
  showPrice = false,
}: ProductActionsProps) {
  const router = useRouter();
  // The desktop panel and the mobile sheet are both mounted at once, so every
  // id in here has to be instance-scoped.
  const uid = useId();
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const { addItem, openCart, saveForLater } = useCartStore();
  const openStylistWith = useUIStore((s) => s.openStylistWith);
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  // Availability is derived from stock, never from a stored "enabled" flag —
  // a size disables itself the moment its count reaches zero.
  const sizes = useMemo(() => availabilityFor(skus), [skus]);
  const selected = sizes.find((s) => s.size === selectedSize);
  const soldOut = isSoldOut(skus);
  const minPrice = fromPrice(skus);
  const wishlisted = isWishlisted(productId);

  // The stepper can never offer more than the chosen variant physically has.
  // With nothing chosen yet there is no stock figure to trust, so it stays at 1.
  const maxQuantity = selected?.available ? Math.max(1, selected.stock) : 1;
  const priceEach = selected ? selected.price : minPrice;
  // A variant's own compare-at price wins over the product's, when it has one.
  // `SizeAvailability` doesn't carry it, so it comes off the SKU row itself.
  const compareAt = (selected ? skus.find((s) => s.id === selected.skuId)?.mrp : null) ?? mrp ?? null;
  const savedPercent = discountPercent(priceEach, compareAt);
  const hasPriceRange = new Set(skus.map((s) => s.price)).size > 1;

  const buildCartItem = () => {
    if (!selected) return null;
    return {
      skuId: selected.skuId,
      productId,
      productName,
      productSlug,
      image: primaryImage?.url ?? "",
      size: selected.size,
      color: selected.color,
      price: selected.price,
      quantity: Math.min(Math.max(1, quantity), Math.max(1, selected.stock)),
      stock: selected.stock,
    };
  };

  /** Shared guard for every action that needs a real, buyable size. */
  const requireSize = (): boolean => {
    if (!selectedSize) {
      setError("Please select a size");
      return false;
    }
    if (!selected?.available) {
      setError(
        selected?.disabled
          ? "This size is unavailable — try pre-book instead"
          : "This size is out of stock — try pre-book instead"
      );
      return false;
    }
    setError("");
    return true;
  };

  const handleAddToCart = () => {
    if (!requireSize()) return;
    const item = buildCartItem();
    if (!item) return;

    addItem(item);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 2000);
  };

  /** Straight to checkout — the bag still gets the line so totals are shared. */
  const handleBuyNow = () => {
    if (!requireSize()) return;
    const item = buildCartItem();
    if (!item) return;

    addItem(item, { silent: true });
    router.push("/checkout");
  };

  const handleSaveForLater = () => {
    if (!requireSize()) return;
    const item = buildCartItem();
    if (!item) return;

    // Park it directly: into the bag, then straight out to the saved list.
    addItem(item, { silent: true });
    saveForLater(item.skuId);
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2000);
  };

  const whatsappMessage = (intent: "prebook" | "appointment") => {
    const sizeLine = selectedSize ? `Size: ${selectedSize}` : "Size: To be confirmed";
    const prefix =
      intent === "prebook"
        ? `Hi Dstyle, I'd like to pre-book:\n\n*${productName}*`
        : `Hi Dstyle, I'd like to book an atelier appointment for:\n\n*${productName}*`;
    return encodeURIComponent(`${prefix}\n${sizeLine}\n\nPlease share next steps.`);
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
      {showPrice && (
        // Wraps rather than overflows: at 320px a six-figure price, its
        // compare-at and the saving chip do not fit on one line.
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <span className="font-display text-[1.75rem] sm:text-[2rem] leading-none text-brand-ink tabular-nums">
            {formatPrice(priceEach)}
          </span>
          {savedPercent != null && compareAt != null && (
            <>
              <span className="price-was font-sans text-[13px] tabular-nums">
                {formatPrice(compareAt)}
              </span>
              <span className="badge badge-sale">{savedPercent}% OFF</span>
            </>
          )}
          {!selected && hasPriceRange && (
            <span className="font-sans text-[12px] text-brand-grey-dark">onwards</span>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
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
            onClick={() => setGuideOpen(true)}
            className="shrink-0 -mr-2 inline-flex items-center min-h-[44px] px-2 text-[11px] font-sans text-[#888888] hover:text-black transition-colors underline underline-offset-2"
          >
            Size guide
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size.skuId}
              type="button"
              disabled={!size.available}
              aria-disabled={!size.available}
              onClick={() => {
                setSelectedSize(size.size);
                // A new variant carries its own stock, so the count starts over
                // rather than silently exceeding what this size actually has.
                setQuantity(1);
                setError("");
              }}
              className={cn(
                "relative min-h-[48px] min-w-[48px] px-4 text-[12px] font-sans font-medium border transition-all duration-300",
                selectedSize === size.size
                  ? "border-brand-ink bg-brand-ink text-white"
                  : !size.available
                    ? // Struck through and non-interactive: unmistakably gone,
                      // but still visible so the shopper knows it exists.
                      "border-brand-ivory-deep text-[#c4c0bb] line-through cursor-not-allowed"
                    : "border-brand-ivory-deep text-black hover:border-brand-gold active:bg-brand-ivory"
              )}
            >
              {size.size}
              {size.lowStock && size.available && selectedSize !== size.size && (
                <span className="block text-[8px] font-normal tracking-wide opacity-60">Low</span>
              )}
            </button>
          ))}
        </div>

        {selected?.available && selected.lowStock && (
          <p className="mt-2.5 text-[11px] font-sans text-[#888888]">
            Only {selected.stock} left in this size
          </p>
        )}
        {selected && !selected.available && (
          <p className="mt-2.5 text-[11px] font-sans text-[#888888]">
            Unavailable in this size — pre-book to reserve
          </p>
        )}
      </div>

      {isActive && !soldOut && (
        <div>
          <p
            id={`${uid}-qty-label`}
            className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black mb-3"
          >
            Quantity
          </p>
          <div
            role="group"
            aria-labelledby={`${uid}-qty-label`}
            className="inline-flex items-center border border-brand-ivory-deep"
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="grid h-12 w-12 place-items-center text-brand-ink transition-colors duration-300 hover:text-brand-gold-deep disabled:opacity-30 disabled:hover:text-brand-ink disabled:cursor-not-allowed"
            >
              <Minus size={15} strokeWidth={1.5} />
            </button>
            <span
              aria-live="polite"
              className="min-w-[3rem] px-1 text-center font-sans text-[14px] tabular-nums text-brand-ink"
            >
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity >= maxQuantity}
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              className="grid h-12 w-12 place-items-center text-brand-ink transition-colors duration-300 hover:text-brand-gold-deep disabled:opacity-30 disabled:hover:text-brand-ink disabled:cursor-not-allowed"
            >
              <Plus size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[12px] font-sans text-brand-wine">{error}</p>}

      {!isActive && (
        <Badge variant="sand" className="w-full justify-center py-2.5 text-[10px] tracking-[0.2em]">
          Coming Soon — Pre-Book Available
        </Badge>
      )}

      {isActive && !soldOut && (
        <div className="space-y-3">
          <Button className="w-full min-h-[52px] text-[11px]" size="lg" onClick={handleBuyNow}>
            Buy Now
          </Button>
          <Button
            variant="outline"
            className="w-full min-h-[52px] text-[11px]"
            size="lg"
            onClick={handleAddToCart}
          >
            {added ? "Added to Bag ✓" : "Add to Bag"}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toggleWishlist(productId)}
              className={cn(
                "flex items-center justify-center gap-2 min-h-[48px] border text-[10px] font-sans tracking-luxe uppercase transition-colors",
                wishlisted
                  ? "border-brand-gold text-brand-gold-deep bg-brand-gold/5"
                  : "border-brand-ivory-deep text-[#888888] hover:border-brand-gold hover:text-brand-gold-deep"
              )}
            >
              <Heart size={13} fill={wishlisted ? "currentColor" : "none"} />
              {wishlisted ? "Wishlisted" : "Wishlist"}
            </button>
            <button
              type="button"
              onClick={handleSaveForLater}
              className="flex items-center justify-center gap-2 min-h-[48px] border border-brand-ivory-deep text-[10px] font-sans tracking-luxe uppercase text-[#888888] hover:border-brand-gold hover:text-brand-gold-deep transition-colors"
            >
              <Bookmark size={13} />
              {savedNote ? "Saved ✓" : "Save for Later"}
            </button>
          </div>
        </div>
      )}

      {soldOut && isActive && (
        <Badge variant="red" className="w-full justify-center py-2.5 text-[10px]">
          Sold Out — Pre-Book Instead
        </Badge>
      )}

      <Button
        variant="ghost"
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
        className="w-full flex min-h-11 items-center justify-center gap-2 py-1 text-[11px] font-sans tracking-luxe uppercase text-brand-gold hover:text-brand-gold-deep transition-colors"
      >
        <Sparkles size={13} />
        Ask the Stylist about this piece
      </button>

      {/* Both halves come from real records — the store's shipping threshold and
          the garment's own dispatch note. With no dispatch note recorded the
          line simply says less rather than promising a lead time. */}
      <p className="text-[11px] font-sans text-[#888888] text-center leading-relaxed">
        {freeShippingThreshold > 0
          ? `Complimentary shipping above ${formatPrice(freeShippingThreshold)}`
          : "Complimentary shipping"}
        {deliveryTime?.trim() ? ` · ${deliveryTime.trim()}` : ""}
      </p>

      <SizeGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        availableSizes={sizes.map((s) => s.size)}
      />

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
          <li>· Fitting &amp; styling consultation</li>
          <li>· Custom alterations discussion</li>
          <li>· Bridal &amp; couture enquiries</li>
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
  const minPrice = fromPrice(props.skus);
  const hasPriceRange = new Set(props.skus.map((s) => s.price)).size > 1;

  return (
    <>
      {/* `data-sticky-cta` is what globals.css keys off to give the footer a
          bottom inset — this bar is fixed, so without that reservation it
          permanently covers the last ~73px of the document. */}
      <div
        data-sticky-cta
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-brand-ivory/95 backdrop-blur-md border-t border-brand-ivory-deep shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      >
        {/* The bar sits on the home-indicator on iOS, so the safe-area inset is
            the floor for its bottom padding. */}
        <div className="px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-sans text-[13px] font-medium text-brand-ink truncate leading-tight">
              {props.productName}
            </p>
            <p className="font-sans text-[12px] text-[#888888] mt-0.5 tabular-nums">
              {formatPrice(minPrice)}
              {hasPriceRange ? " onwards" : ""}
            </p>
          </div>
          <Button className="shrink-0 min-h-[48px] px-5 text-[10px]" onClick={() => setOpen(true)}>
            Select Size
          </Button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={props.productName} size="md">
        {/* The sheet is the only purchase surface on mobile, so it carries the
            price itself — the desktop panel gets it from the page instead. */}
        <ProductActions {...props} showPrice />
      </Modal>
    </>
  );
}
