import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const STATUS_VARIANT: Record<OrderStatus, "default" | "sand" | "outline" | "red"> = {
  PENDING: "sand",
  CONFIRMED: "default",
  PROCESSING: "default",
  SHIPPED: "sand",
  DELIVERED: "outline",
  CANCELLED: "red",
  RETURNED: "red",
};

type UserOrder = Awaited<ReturnType<typeof prisma.order.findMany<{
  include: {
    items: {
      include: {
        sku: {
          include: {
            product: {
              select: { name: true; slug: true; images: { take: 1; orderBy: { sortOrder: "asc" } } };
            };
          };
        };
      };
    };
  };
}>>>[number];

async function getUserOrders(userId: string): Promise<UserOrder[]> {
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

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const orders = await getUserOrders(session.user.id);

  return (
    <div className="pt-[72px] min-h-screen bg-brand-ivory">
      <div className="max-w-[900px] mx-auto px-6 lg:px-12 py-14">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-sans tracking-luxe uppercase text-brand-gold mb-2">
            Welcome back
          </p>
          <h1 className="font-display italic text-4xl lg:text-5xl text-black">
            {session.user.name ?? "My Account"}
          </h1>
          <p className="text-[12px] font-sans text-[#888888] mt-2">
            {session.user.email}
          </p>
          <span className="mt-6 block h-px w-16 gold-rule-solid opacity-60" />
        </div>

        {/* Orders */}
        <div>
          <h2 className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black mb-6">
            Order History
          </h2>

          {orders.length === 0 ? (
            <div className="text-center py-16 border border-brand-ivory-deep bg-white">
              <p className="font-display italic text-3xl text-[#888888] mb-4">
                No orders yet
              </p>
              <Link
                href="/collections"
                className="link-reveal text-[11px] font-sans tracking-luxe uppercase text-black hover:text-brand-gold transition-colors"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-brand-ivory-deep bg-white p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[11px] font-mono text-[#888888]">
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-[11px] font-sans text-[#888888] mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={STATUS_VARIANT[order.status]}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                      <p className="text-[13px] font-sans font-medium text-black mt-1">
                        {formatPrice(Number(order.totalAmount))}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <Link
                          href={`/products/${item.sku.product.slug}`}
                          className="relative h-16 w-14 bg-brand-ivory-deep shrink-0 overflow-hidden"
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
                          <p className="text-[12px] font-sans text-black mt-0.5">
                            {formatPrice(Number(item.priceSnap) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
