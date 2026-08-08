import { CreditCard, RotateCcw, Scissors, Truck } from "lucide-react";
import { RETURN_WINDOW_DAYS } from "@/lib/account";
import { formatPrice } from "@/lib/utils";

/**
 * The "what you get" block.
 *
 * Every number below is read from the live store config or from the product
 * record. A row whose source field is empty simply doesn't render — a trust
 * block that promises something the shop doesn't actually do is worse than a
 * shorter one.
 */
interface ProductTrustProps {
  /** The price this block is headlined against — the selected/from price. */
  price: number;
  /** Product.fabric, falling back to Product.material. */
  fabric?: string | null;
  /** Product.deliveryTime — the free-text dispatch promise. */
  deliveryTime?: string | null;
  /** StoreSetting.freeShippingThreshold */
  freeShippingThreshold: number;
  /** StoreSetting.codFee — 0 means COD carries no surcharge. */
  codFee: number;
  className?: string;
}

export function ProductTrust({
  price,
  fabric,
  deliveryTime,
  freeShippingThreshold,
  codFee,
  className,
}: ProductTrustProps) {
  const rows: { icon: React.ReactNode; label: string; detail: string }[] = [];

  const craft = fabric?.trim();
  if (craft) {
    rows.push({
      icon: <Scissors size={15} strokeWidth={1.5} />,
      label: "The cloth",
      detail: craft,
    });
  }

  rows.push({
    icon: <CreditCard size={15} strokeWidth={1.5} />,
    label: "Payment",
    detail:
      codFee > 0
        ? `Card, UPI and netbanking, or cash on delivery for ${formatPrice(codFee)}`
        : "Card, UPI and netbanking, or cash on delivery at no extra charge",
  });

  const dispatch = deliveryTime?.trim();
  rows.push({
    icon: <Truck size={15} strokeWidth={1.5} />,
    label: "Delivery",
    detail: dispatch
      ? `${dispatch} · complimentary above ${formatPrice(freeShippingThreshold)}`
      : `Complimentary shipping on orders above ${formatPrice(freeShippingThreshold)}`,
  });

  rows.push({
    icon: <RotateCcw size={15} strokeWidth={1.5} />,
    label: "Returns",
    detail: `${RETURN_WINDOW_DAYS} days from delivery to raise a return, from your account`,
  });

  return (
    <section className={className} aria-labelledby="product-trust-title">
      <h2 id="product-trust-title" className="eyebrow">
        What you get for {formatPrice(price)}
      </h2>

      <ul className="mt-4 divide-y divide-brand-line border-y border-brand-line">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start gap-4 py-3.5">
            <span aria-hidden className="mt-0.5 shrink-0 text-brand-gold">
              {row.icon}
            </span>
            <div className="min-w-0">
              <p className="micro-label text-brand-ink">{row.label}</p>
              <p className="mt-1.5 font-sans text-[13px] leading-[1.6] text-brand-ink-soft">
                {row.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
