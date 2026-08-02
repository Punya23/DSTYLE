import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { formatDate, hasInvoice, invoiceNumber, orderRef } from "@/lib/account";
import { PrintButton } from "@/components/account/PrintButton";

export const metadata = { title: "Invoice · Dstyle" };

/**
 * Printable invoice. `#invoice` is the only thing that survives the print
 * stylesheet, so the storefront nav, footer and account sidebar don't end up
 * on the page the customer saves as PDF.
 */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice, #invoice * { visibility: visible !important; }
  #invoice {
    position: absolute !important;
    inset: 0 !important;
    margin: 0 !important;
    padding: 24px !important;
    border: 0 !important;
    width: 100% !important;
  }
  .no-print { display: none !important; }
}
`;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      address: true,
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          sku: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });

  if (!order) notFound();

  if (!hasInvoice(order.status)) {
    return (
      <div className="border border-brand-ivory-deep bg-white p-6">
        <p className="text-[12px] font-sans text-[#666666]">
          No invoice exists for this order yet — it is raised once payment is confirmed.
        </p>
        <Link
          href={`/account/orders/${order.id}`}
          className="link-reveal mt-4 inline-block text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
        >
          Back to order
        </Link>
      </div>
    );
  }

  const lineSubtotal = order.items.reduce(
    (sum, item) => sum + Number(item.priceSnap) * item.quantity,
    0
  );
  const total = Number(order.totalAmount);
  // Orders placed before the tax breakdown existed have zeroed columns; fall
  // back to deriving shipping from the total so old invoices still balance.
  const subtotal = Number(order.subtotal) || lineSubtotal;
  const discount = Number(order.discountTotal);
  const tax = Number(order.taxTotal);
  const shipping =
    Number(order.subtotal) > 0
      ? Number(order.shippingTotal)
      : Math.max(total - lineSubtotal, 0);

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/account/invoices"
          className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] transition-colors hover:text-brand-gold"
        >
          ← All invoices
        </Link>
        <PrintButton />
      </div>

      <article id="invoice" className="border border-brand-ivory-deep bg-white p-8">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-brand-ivory-deep pb-6">
          <div>
            <p className="font-display italic text-2xl text-black">Dstyle</p>
            <p className="mt-1 text-[11px] font-sans text-[#888888]">
              Tax invoice · Prices inclusive of applicable taxes
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-sans tracking-luxe uppercase text-[#888888]">Invoice</p>
            <p className="font-mono text-[13px] text-black">{invoiceNumber(order)}</p>
            <p className="mt-1 text-[11px] font-sans text-[#888888]">
              {formatDate(order.createdAt)}
            </p>
            <p className="font-mono text-[11px] text-[#888888]">Order {orderRef(order.id)}</p>
          </div>
        </header>

        <div className="grid gap-6 border-b border-brand-ivory-deep py-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
              Billed to
            </p>
            <p className="text-[12px] font-sans text-black">{order.user.name ?? "—"}</p>
            <p className="text-[12px] font-sans text-[#666666]">{order.user.email}</p>
            {order.user.phone && (
              <p className="text-[12px] font-sans text-[#666666]">{order.user.phone}</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
              Shipped to
            </p>
            <address className="text-[12px] font-sans not-italic leading-relaxed text-[#666666]">
              {order.address.name}
              <br />
              {order.address.line1}
              {order.address.line2 ? (
                <>
                  <br />
                  {order.address.line2}
                </>
              ) : null}
              <br />
              {order.address.city}, {order.address.state} {order.address.pincode}
              <br />
              {order.address.phone}
            </address>
          </div>
        </div>

        <table className="w-full py-6 text-left">
          <thead>
            <tr className="border-b border-brand-ivory-deep">
              <th className="py-3 text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
                Item
              </th>
              <th className="py-3 text-right text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
                Qty
              </th>
              <th className="py-3 text-right text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
                Unit
              </th>
              <th className="py-3 text-right text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-brand-ivory-deep last:border-0">
                <td className="py-3 text-[12px] font-sans text-black">
                  {item.sku.product.name}
                  <span className="block text-[11px] text-[#888888]">
                    Size {item.sku.size}
                    {item.sku.color ? ` · ${item.sku.color}` : ""} · {item.sku.skuCode}
                  </span>
                </td>
                <td className="py-3 text-right text-[12px] font-sans text-[#666666]">
                  {item.quantity}
                </td>
                <td className="py-3 text-right text-[12px] font-sans text-[#666666]">
                  {formatPrice(Number(item.priceSnap))}
                </td>
                <td className="py-3 text-right text-[12px] font-sans text-black">
                  {formatPrice(Number(item.priceSnap) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-[260px] space-y-1.5 border-t border-brand-ivory-deep pt-4 text-[12px] font-sans">
          <div className="flex justify-between text-[#666666]">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[#666666]">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>−{formatPrice(discount)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-[#666666]">
              <span>GST (included)</span>
              <span>{formatPrice(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-[#666666]">
            <span>Shipping &amp; other</span>
            <span>{formatPrice(shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-brand-ivory-deep pt-2 font-medium text-black">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <p className="pt-2 text-[11px] text-[#888888]">
            {order.paymentMethod ? `Paid via ${order.paymentMethod}` : "Payment pending"}
            {order.razorpayPaymentId ? ` · ${order.razorpayPaymentId}` : ""}
          </p>
        </div>

        <footer className="mt-8 border-t border-brand-ivory-deep pt-4 text-[11px] font-sans text-[#888888]">
          Thank you for shopping with Dstyle. For anything at all, reply to your order email and
          we&apos;ll take care of it.
        </footer>
      </article>
    </div>
  );
}
