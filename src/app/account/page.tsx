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

async function getOverview(userId: string) {
  try {
    const [recentOrders, totals, openReturns, wishlistCount, deliveredItems] =
      await Promise.all([
        prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 3,
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
        }),
        prisma.order.aggregate({
          where: { userId, status: { notIn: ["PENDING", "CANCELLED"] } },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.returnRequest.count({
          where: { userId, status: { in: ["REQUESTED", "APPROVED", "PICKED_UP", "RECEIVED"] } },
        }),
        prisma.wishlistItem.count({ where: { userId } }),
        // Delivered products the customer hasn't reviewed yet.
        prisma.orderItem.findMany({
          where: { order: { userId, status: "DELIVERED" } },
          select: { sku: { select: { productId: true } } },
        }),
      ]);

    const reviewed = await prisma.review.findMany({
      where: { userId },
      select: { productId: true },
    });
    const reviewedIds = new Set(reviewed.map((r) => r.productId));
    const awaitingReview = new Set(
      deliveredItems.map((i) => i.sku.productId).filter((id) => !reviewedIds.has(id))
    ).size;

    return {
      recentOrders,
      orderCount: totals._count,
      lifetimeSpend: Number(totals._sum.totalAmount ?? 0),
      openReturns,
      wishlistCount,
      awaitingReview,
    };
  } catch {
    return {
      recentOrders: [],
      orderCount: 0,
      lifetimeSpend: 0,
      openReturns: 0,
      wishlistCount: 0,
      awaitingReview: 0,
    };
  }
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="border border-brand-ivory-deep bg-white p-5 transition-colors hover:border-brand-gold"
    >
      <p className="text-[10px] font-sans tracking-luxe uppercase text-[#888888]">{label}</p>
      <p className="mt-2 font-display italic text-2xl text-black">{value}</p>
    </Link>
  );
}

export default async function AccountOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const data = await getOverview(session.user.id);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={String(data.orderCount)} href="/account/orders" />
        <Stat
          label="Lifetime spend"
          value={formatPrice(data.lifetimeSpend)}
          href="/account/invoices"
        />
        <Stat label="Wishlist" value={String(data.wishlistCount)} href="/account/wishlist" />
        <Stat
          label="To review"
          value={String(data.awaitingReview)}
          href="/account/reviews"
        />
      </div>

      {data.openReturns > 0 && (
        <Link
          href="/account/returns"
          className="block border border-brand-gold/40 bg-brand-champagne/40 p-5 transition-colors hover:border-brand-gold"
        >
          <p className="text-[11px] font-sans tracking-luxe uppercase text-black">
            {data.openReturns} return{data.openReturns > 1 ? "s" : ""} in progress
          </p>
          <p className="mt-1 text-[12px] font-sans text-[#666666]">
            Track the status of your return requests.
          </p>
        </Link>
      )}

      <AccountSection
        title="Recent Orders"
        action={
          <Link
            href="/account/orders"
            className="link-reveal text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
          >
            View all
          </Link>
        }
      >
        {data.recentOrders.length === 0 ? (
          <EmptyState title="No orders yet" ctaHref="/collections" ctaLabel="Start Shopping" />
        ) : (
          <div className="space-y-4">
            {data.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block border border-brand-ivory-deep bg-white p-6 transition-colors hover:border-brand-gold"
              >
                <div className="mb-4 flex items-start justify-between">
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

                <div className="flex gap-2">
                  {order.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
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
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <span className="self-end text-[11px] font-sans text-[#888888]">
                      +{order.items.length - 4} more
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </AccountSection>
    </div>
  );
}
