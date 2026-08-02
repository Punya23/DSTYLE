import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { formatDateTime, orderRef } from "@/lib/account";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { OrderTimelinePanel } from "@/components/admin/OrderTimelinePanel";
import type { OrderStatus } from "@/types";

async function getOrder(id: string) {
  try {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        address: true,
        items: {
          include: { sku: { include: { product: { select: { name: true, slug: true } } } } },
        },
        events: { orderBy: { createdAt: "desc" } },
      },
    });
  } catch {
    return null;
  }
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const money = [
    { label: "Subtotal", value: Number(order.subtotal) },
    ...(Number(order.discountTotal) > 0
      ? [
          {
            label: order.couponCode ? `Discount (${order.couponCode})` : "Discount",
            value: -Number(order.discountTotal),
          },
        ]
      : []),
    ...(Number(order.taxTotal) > 0 ? [{ label: "GST", value: Number(order.taxTotal) }] : []),
    { label: "Shipping", value: Number(order.shippingTotal) },
  ];

  return (
    <div className="p-4 sm:p-8">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-[11px] font-sans tracking-luxe uppercase text-[#888888] hover:text-black transition-colors mb-6"
      >
        <ArrowLeft size={13} /> All orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">
            Fulfilment
          </p>
          <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">
            {orderRef(order.id)}
          </h1>
          <p className="text-[11px] font-sans text-[#888888] mt-1">
            Placed {formatDateTime(order.createdAt)}
            {order.paymentMethod ? ` · ${order.paymentMethod}` : ""}
          </p>
        </div>
        <OrderStatusSelect orderId={order.id} currentStatus={order.status as OrderStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-10">
        <OrderTimelinePanel
          orderId={order.id}
          status={order.status as OrderStatus}
          trackingNumber={order.trackingNumber}
          carrier={order.carrier}
          events={order.events.map((e) => ({
            id: e.id,
            status: e.status as OrderStatus,
            message: e.message,
            location: e.location,
            createdAt: e.createdAt.toISOString(),
          }))}
        />

        <div className="space-y-8">
          <section>
            <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
              Items
            </h2>
            <div className="bg-white border border-[#e0e0e0] divide-y divide-[#f2f2f2]">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-sans font-medium text-black leading-snug">
                      {item.sku.product.name}
                    </p>
                    <p className="text-[11px] font-sans text-[#888888] mt-0.5">
                      {item.sku.size}
                      {item.sku.color ? ` · ${item.sku.color}` : ""} × {item.quantity}
                    </p>
                    {Number(item.taxRate) > 0 && (
                      <p className="text-[10px] font-sans text-[#aaa] mt-0.5">
                        GST {Number(item.taxRate)}% · {formatPrice(Number(item.taxAmount))}
                      </p>
                    )}
                  </div>
                  <p className="text-[12px] font-sans text-black shrink-0">
                    {formatPrice(Number(item.priceSnap) * item.quantity)}
                  </p>
                </div>
              ))}

              <div className="p-4 space-y-2">
                {money.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between text-[12px] font-sans text-[#888888]"
                  >
                    <span>{row.label}</span>
                    <span>{formatPrice(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[13px] font-sans font-medium text-black border-t border-[#eee] pt-2.5">
                  <span>Total</span>
                  <span>{formatPrice(Number(order.totalAmount))}</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-4">
              Customer
            </h2>
            <div className="bg-white border border-[#e0e0e0] p-4 space-y-1">
              <p className="text-[12px] font-sans font-medium text-black">
                {order.user.name ?? "Guest"}
              </p>
              <p className="text-[11px] font-sans text-[#888888]">
                {order.user.email ?? order.user.phone ?? "—"}
              </p>
              <div className="pt-3 text-[11px] font-sans text-[#6b6560] leading-relaxed">
                <p>{order.address.name}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>
                  {order.address.city}, {order.address.state} {order.address.pincode}
                </p>
                <p className="mt-1">{order.address.phone}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
