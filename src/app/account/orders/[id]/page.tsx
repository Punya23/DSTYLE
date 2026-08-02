import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANT,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANT,
  buildTimeline,
  formatDate,
  hasInvoice,
  isReturnEligible,
  orderRef,
  returnWindowClosesAt,
} from "@/lib/account";
import { Badge } from "@/components/ui/badge";
import { OrderTimeline } from "@/components/account/OrderTimeline";

export const metadata = { title: "Order · Dstyle" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const order = await prisma.order.findFirst({
    // Scoped by userId, not just id — an order id must never be enough to read
    // someone else's order.
    where: { id, userId: session.user.id },
    include: {
      address: true,
      events: { orderBy: { createdAt: "asc" } },
      returns: { orderBy: { createdAt: "desc" } },
      items: {
        include: {
          sku: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: { take: 1, orderBy: { sortOrder: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const timeline = buildTimeline(order, order.events);
  const openReturn = order.returns[0] ?? null;
  const canReturn = isReturnEligible(order, order.returns.length > 0);
  const returnCloses = returnWindowClosesAt(order);
  const subtotal = order.items.reduce(
    (sum, item) => sum + Number(item.priceSnap) * item.quantity,
    0
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/account/orders"
            className="text-[10px] font-sans tracking-luxe uppercase text-[#888888] transition-colors hover:text-brand-gold"
          >
            ← All orders
          </Link>
          <h2 className="mt-3 font-display italic text-3xl text-black">
            Order {orderRef(order.id)}
          </h2>
          <p className="mt-1 text-[12px] font-sans text-[#888888]">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      {/* Tracking */}
      <section id="tracking" className="border border-brand-ivory-deep bg-white p-6">
        <h3 className="mb-6 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          Tracking
        </h3>

        {order.trackingNumber && (
          <div className="mb-6 border border-brand-ivory-deep bg-brand-ivory p-4">
            <p className="text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
              {order.carrier ?? "Courier"} · Tracking number
            </p>
            <p className="mt-1 font-mono text-[13px] text-black">{order.trackingNumber}</p>
          </div>
        )}

        <OrderTimeline steps={timeline} />

        {order.events.some((e) => e.message || e.location) && (
          <div className="mt-6 border-t border-brand-ivory-deep pt-4">
            <p className="mb-2 text-[10px] font-sans tracking-luxe uppercase text-[#888888]">
              Updates
            </p>
            <ul className="space-y-1.5">
              {order.events
                .filter((e) => e.message || e.location)
                .map((event) => (
                  <li key={event.id} className="text-[12px] font-sans text-[#666666]">
                    {event.message}
                    {event.location ? ` · ${event.location}` : ""}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      {/* Items */}
      <section className="border border-brand-ivory-deep bg-white p-6">
        <h3 className="mb-5 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          Items
        </h3>
        <div className="space-y-5">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-4">
              <Link
                href={`/products/${item.sku.product.slug}`}
                className="relative h-24 w-20 shrink-0 overflow-hidden bg-brand-ivory-deep"
              >
                {item.sku.product.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.sku.product.images[0].url}
                    alt={item.sku.product.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.sku.product.slug}`}
                  className="text-[13px] font-sans font-medium text-black hover:text-brand-gold"
                >
                  {item.sku.product.name}
                </Link>
                <p className="text-[11px] font-sans text-[#888888]">
                  Size {item.sku.size}
                  {item.sku.color ? ` · ${item.sku.color}` : ""} · Qty {item.quantity}
                </p>
                <p className="mt-0.5 text-[12px] font-sans text-black">
                  {formatPrice(Number(item.priceSnap) * item.quantity)}
                </p>
                {order.status === "DELIVERED" && (
                  <Link
                    href="/account/reviews"
                    className="mt-1.5 inline-block text-[10px] font-sans tracking-luxe uppercase text-brand-gold hover:underline"
                  >
                    Write a review
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-1.5 border-t border-brand-ivory-deep pt-4 text-[12px] font-sans">
          <div className="flex justify-between text-[#666666]">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between font-medium text-black">
            <span>Total paid</span>
            <span>{formatPrice(Number(order.totalAmount))}</span>
          </div>
        </div>
      </section>

      {/* Delivery + payment */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-brand-ivory-deep bg-white p-6">
          <h3 className="mb-3 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
            Delivery Address
          </h3>
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
        </section>

        <section className="border border-brand-ivory-deep bg-white p-6">
          <h3 className="mb-3 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
            Payment
          </h3>
          <p className="text-[12px] font-sans text-[#666666]">
            {order.paymentMethod ? `Paid via ${order.paymentMethod}` : "Payment pending"}
          </p>
          {order.razorpayPaymentId && (
            <p className="mt-1 font-mono text-[11px] text-[#999999]">
              {order.razorpayPaymentId}
            </p>
          )}
          {hasInvoice(order.status) && (
            <Link
              href={`/account/invoices/${order.id}`}
              className="link-reveal mt-4 inline-block text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
            >
              View invoice
            </Link>
          )}
        </section>
      </div>

      {/* Returns */}
      <section className="border border-brand-ivory-deep bg-white p-6">
        <h3 className="mb-3 text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          Returns
        </h3>

        {openReturn ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={RETURN_STATUS_VARIANT[openReturn.status]}>
              {RETURN_STATUS_LABELS[openReturn.status]}
            </Badge>
            <span className="text-[12px] font-sans text-[#666666]">
              Requested {formatDate(openReturn.createdAt)}
            </span>
            <Link
              href="/account/returns"
              className="link-reveal text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
            >
              Manage return
            </Link>
          </div>
        ) : canReturn ? (
          <>
            <p className="text-[12px] font-sans text-[#666666]">
              Returns accepted until {formatDate(returnCloses)}.
            </p>
            <Link
              href={`/account/returns/new?orderId=${order.id}`}
              className="link-reveal mt-3 inline-block text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
            >
              Request a return
            </Link>
          </>
        ) : (
          <p className="text-[12px] font-sans text-[#888888]">
            {order.status === "DELIVERED"
              ? "The return window for this order has closed."
              : "Returns open once the order is delivered."}
          </p>
        )}
      </section>
    </div>
  );
}
