"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Script from "next/script";
import Link from "next/link";
import { CreditCard, Truck, Plus } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { CouponField, PriceBreakdown } from "@/components/store/PriceBreakdown";
import { formatPrice, cn } from "@/lib/utils";
import { formatAddress, type SavedAddress } from "@/lib/address";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (resp: unknown) => void) => void;
    };
  }
}

interface Address {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

type PayMethod = "razorpay" | "cod";

const REQUIRED: (keyof Address)[] = ["name", "line1", "city", "state", "pincode", "phone"];

export default function CheckoutPage() {
  const { data: session } = useSession();
  const { items, couponCode, clearCart } = useCartStore();

  const [address, setAddress] = useState<Address>({
    name: session?.user?.name ?? "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
  });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  // `null` means "use the form below" — either a new address, or the only
  // option available before anything has been saved.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<PayMethod>("razorpay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // The bill is priced server-side, so GST, shipping and the coupon shown here
  // are the exact figures the order will be created with.
  const { quote, loading: quoteLoading, couponError } = useCartQuote(method);

  // Pull the address book once the shopper is known to be signed in, and
  // pre-select their default so returning customers can pay in one click.
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    fetch("/api/addresses")
      .then((res) => (res.ok ? res.json() : { addresses: [] }))
      .then((json) => {
        if (cancelled) return;
        const list = (json.addresses ?? []) as SavedAddress[];
        setSavedAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) setSelectedId(preferred.id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const set = (field: keyof Address, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const selectedAddress = savedAddresses.find((a) => a.id === selectedId) ?? null;

  const handlePlaceOrder = async () => {
    setError(null);

    if (!selectedAddress) {
      const missing = REQUIRED.find((f) => !address[f].trim());
      if (missing) {
        setError("Please fill in all required delivery details.");
        return;
      }
    }
    if (method === "razorpay" && (!scriptReady || typeof window.Razorpay === "undefined")) {
      setError("Payment is still loading — please try again in a moment.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ skuId: i.skuId, quantity: i.quantity })),
          ...(selectedAddress
            ? { addressId: selectedAddress.id }
            : { address, saveAddress }),
          paymentMethod: method,
          couponCode,
        }),
      });
      const data = await res.json();

      if (res.status === 401) {
        setError("Please sign in to complete your order.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not place your order. Please try again.");
        setLoading(false);
        return;
      }

      // Cash on Delivery — order already confirmed server-side
      if (data.cod) {
        clearCart();
        setOrderPlaced(true);
        setLoading(false);
        return;
      }

      // Razorpay online payment
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Dstyle",
        description: "Indian Couture",
        order_id: data.razorpayOrderId,
        prefill: {
          name: selectedAddress?.name ?? address.name,
          email: session?.user?.email ?? undefined,
          contact: selectedAddress?.phone ?? address.phone,
        },
        theme: { color: "#0a0a0a" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verify = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const vdata = await verify.json();
            if (verify.ok && vdata.success) {
              clearCart();
              setOrderPlaced(true);
            } else {
              setError("We couldn't verify your payment. If money was deducted, your order will be confirmed shortly.");
            }
          } catch {
            setError("Payment verification failed. Please contact support with your payment ID.");
          } finally {
            setLoading(false);
          }
        },
      });

      rzp.on("payment.failed", () => {
        setError("Payment failed or was cancelled. You have not been charged.");
        setLoading(false);
      });

      rzp.open();
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="pt-[72px] min-h-screen flex items-center justify-center px-6 bg-brand-ivory">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-8 grid place-items-center h-16 w-16 rounded-full border border-brand-gold text-brand-gold text-2xl">
            ✓
          </div>
          <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-3">Order Confirmed</p>
          <h1 className="font-display italic text-4xl md:text-5xl text-black mb-5">Thank you.</h1>
          <p className="font-sans text-[14px] text-[#666] leading-relaxed mb-9">
            Your order is confirmed and a confirmation email is on its way. Our atelier will begin
            preparing your pieces with care.
          </p>
          <Link href="/account/orders">
            <Button size="lg">View My Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pt-[72px] min-h-screen flex items-center justify-center px-6 bg-brand-ivory">
        <div className="text-center max-w-md">
          <h1 className="font-display italic text-4xl text-black mb-4">Your bag is empty</h1>
          <p className="font-sans text-[14px] text-[#888] mb-8">Discover our latest couture and festive edits.</p>
          <Link href="/collections">
            <Button size="lg">Explore Collections</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />

      <div className="pt-[72px] min-h-screen bg-brand-ivory">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-14 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-16">
          {/* Address + payment */}
          <div>
            <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-2">Checkout</p>
            <h1 className="font-display italic text-4xl text-black mb-9">Delivery Details</h1>

            {savedAddresses.length > 0 && (
              <div className="mb-8 space-y-3">
                {savedAddresses.map((saved) => (
                  <button
                    key={saved.id}
                    onClick={() => {
                      setSelectedId(saved.id);
                      setError(null);
                    }}
                    className={cn(
                      "w-full flex items-start gap-4 px-5 py-4 border text-left transition-colors",
                      selectedId === saved.id
                        ? "border-brand-gold bg-brand-gold/5"
                        : "border-brand-ivory-deep bg-white hover:border-brand-gold/50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 shrink-0 h-4 w-4 rounded-full border grid place-items-center",
                        selectedId === saved.id ? "border-brand-gold" : "border-[#ccc]"
                      )}
                    >
                      {selectedId === saved.id && (
                        <span className="h-2 w-2 rounded-full bg-brand-gold" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-sans font-medium text-black">
                          {saved.name}
                        </span>
                        {saved.isDefault && (
                          <span className="text-[9px] font-sans tracking-luxe uppercase text-brand-gold">
                            Default
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] font-sans text-[#888] mt-0.5 leading-relaxed">
                        {formatAddress(saved)}
                      </span>
                      <span className="block text-[11px] font-sans text-[#888]">{saved.phone}</span>
                    </span>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setSelectedId(null);
                    setError(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 border text-left transition-colors",
                    selectedId === null
                      ? "border-brand-gold bg-brand-gold/5"
                      : "border-brand-ivory-deep bg-white hover:border-brand-gold/50"
                  )}
                >
                  <span className={cn("shrink-0", selectedId === null ? "text-brand-gold" : "text-[#888]")}>
                    <Plus size={18} strokeWidth={1.5} />
                  </span>
                  <span className="text-[13px] font-sans font-medium text-black">
                    Deliver to a new address
                  </span>
                </button>
              </div>
            )}

            <div className={cn("space-y-5", selectedAddress && "hidden")}>
              <Input label="Full Name" value={address.name} onChange={(e) => set("name", e.target.value)} placeholder="As on ID" required />
              <Input label="Address Line 1" value={address.line1} onChange={(e) => set("line1", e.target.value)} placeholder="House / Flat / Building" required />
              <Input label="Address Line 2" value={address.line2} onChange={(e) => set("line2", e.target.value)} placeholder="Street / Area (optional)" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" value={address.city} onChange={(e) => set("city", e.target.value)} placeholder="Mumbai" required />
                <Input label="State" value={address.state} onChange={(e) => set("state", e.target.value)} placeholder="Maharashtra" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Pincode" value={address.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="400001" required />
                <Input label="Phone" value={address.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" required />
              </div>

              <label className="flex items-center gap-2.5 text-[12px] font-sans text-[#666] cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#b8935e]"
                />
                Save this address to my address book
              </label>
            </div>

            {/* Payment method */}
            <h2 className="mt-11 mb-5 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
              Payment Method
            </h2>
            <div className="space-y-3">
              <MethodOption
                active={method === "razorpay"}
                onClick={() => { setMethod("razorpay"); setError(null); }}
                icon={<CreditCard size={18} strokeWidth={1.5} />}
                title="Pay Online"
                subtitle="UPI · Cards · Netbanking, secured by Razorpay"
              />
              <MethodOption
                active={method === "cod"}
                onClick={() => { setMethod("cod"); setError(null); }}
                icon={<Truck size={18} strokeWidth={1.5} />}
                title="Cash on Delivery"
                subtitle="Pay when your order arrives"
              />
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:sticky lg:top-[100px] lg:self-start">
            <div className="border border-brand-ivory-deep bg-white p-7 space-y-6">
              <h2 className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">Order Summary</h2>

              <div className="space-y-4 max-h-[280px] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.skuId} className="flex gap-3">
                    <div className="relative h-20 w-16 bg-brand-ivory-deep shrink-0 overflow-hidden">
                      <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="64px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-sans text-black leading-snug font-medium line-clamp-1">{item.productName}</p>
                      <p className="text-[11px] font-sans text-[#888888] mt-0.5">{item.size} · Qty {item.quantity}</p>
                      <p className="text-[12px] font-sans text-black mt-1">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-brand-ivory-deep pt-4">
                <CouponField error={couponError} applied={quote.coupon} className="mb-4" />
                <PriceBreakdown quote={quote} loading={quoteLoading} />
              </div>

              {error && (
                <p className="text-[12px] font-sans text-brand-wine bg-brand-wine/5 border border-brand-wine/20 px-3 py-2.5 leading-snug">
                  {error}
                </p>
              )}

              <Button className="w-full" size="lg" onClick={handlePlaceOrder} loading={loading} disabled={items.length === 0}>
                {method === "cod" ? "Place Order" : `Pay ${formatPrice(quote.total)}`}
              </Button>

              <p className="text-[10px] font-sans text-[#888888] text-center tracking-wide">
                {method === "cod" ? "Pay in cash when your couture arrives" : "Secured by Razorpay · UPI · Cards · Netbanking"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MethodOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 border text-left transition-colors",
        active ? "border-brand-gold bg-brand-gold/5" : "border-brand-ivory-deep bg-white hover:border-brand-gold/50"
      )}
    >
      <span className={cn("shrink-0", active ? "text-brand-gold" : "text-[#888]")}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-sans font-medium text-black">{title}</span>
        <span className="block text-[11px] font-sans text-[#888] mt-0.5">{subtitle}</span>
      </span>
      <span className={cn("shrink-0 h-4 w-4 rounded-full border grid place-items-center", active ? "border-brand-gold" : "border-[#ccc]")}>
        {active && <span className="h-2 w-2 rounded-full bg-brand-gold" />}
      </span>
    </button>
  );
}
