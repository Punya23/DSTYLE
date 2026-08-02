import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANT,
  formatDate,
  orderRef,
} from "@/lib/account";
import { Badge } from "@/components/ui/badge";
import { AccountSection, EmptyState } from "@/components/account/AccountSection";

export const metadata = { title: "Orders · Dstyle" };

async function getOrders(userId: string) {
  try {
    return await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
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
  } catch {
    return [];
  }
}

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const orders = await getOrders(session.user.id);

  return (
    <AccountSection title="Order History" description="Every order you've placed with us.">
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" ctaHref="/collections" ctaLabel="Start Shopping" />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-brand-ivory-deep bg-white p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono text-[#888888]">{orderRef(order.id)}</p>
                  <p className="mt-0.5 text-[11px] font-sans text-[#888888]">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <p className="mt-1 text-[13px] font-sans font-medium text-black">
                    {formatPrice(Number(order.totalAmount))}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Link
                      href={`/products/${item.sku.product.slug}`}
                      className="relative h-16 w-14 shrink-0 overflow-hidden bg-brand-ivory-deep"
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
                    <div>
                      <p className="text-[12px] font-sans font-medium text-black">
                        {item.sku.product.name}
                      </p>
                      <p className="text-[11px] font-sans text-[#888888]">
                        Size {item.sku.size} · Qty {item.quantity}
                      </p>
                      <p className="mt-0.5 text-[12px] font-sans text-black">
                        {formatPrice(Number(item.priceSnap) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-5 border-t border-brand-ivory-deep pt-4">
                <Link
                  href={`/account/orders/${order.id}`}
                  className="link-reveal text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
                >
                  Order details
                </Link>
                {(order.status === "SHIPPED" || order.status === "PACKED") && (
                  <Link
                    href={`/account/orders/${order.id}#tracking`}
                    className="link-reveal text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
                  >
                    Track order
                  </Link>
                )}
                {order.status !== "PENDING" && order.status !== "CANCELLED" && (
                  <Link
                    href={`/account/invoices/${order.id}`}
                    className="link-reveal text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
                  >
                    Invoice
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountSection>
  );
}
