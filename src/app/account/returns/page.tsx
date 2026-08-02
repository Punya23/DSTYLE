import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANT,
  RETURN_WINDOW_DAYS,
  formatDate,
  isReturnCancellable,
  orderRef,
} from "@/lib/account";
import { Badge } from "@/components/ui/badge";
import { AccountSection, EmptyState } from "@/components/account/AccountSection";
import { CancelReturnButton } from "@/components/account/CancelReturnButton";

export const metadata = { title: "Returns · Dstyle" };

async function getReturns(userId: string) {
  try {
    return await prisma.returnRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            orderItem: {
              include: {
                sku: {
                  include: {
                    product: {
                      select: {
                        name: true,
                        slug: true,
                        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
                      },
                    },
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

export default async function ReturnsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const returns = await getReturns(session.user.id);

  return (
    <AccountSection
      title="Returns"
      description={`Pieces can be returned within ${RETURN_WINDOW_DAYS} days of delivery.`}
    >
      {returns.length === 0 ? (
        <EmptyState
          title="No returns raised"
          ctaHref="/account/orders"
          ctaLabel="View your orders"
        />
      ) : (
        <div className="space-y-4">
          {returns.map((request) => (
            <div key={request.id} className="border border-brand-ivory-deep bg-white p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/account/orders/${request.orderId}`}
                    className="text-[11px] font-mono text-[#888888] hover:text-brand-gold"
                  >
                    Order {orderRef(request.orderId)}
                  </Link>
                  <p className="mt-0.5 text-[11px] font-sans text-[#888888]">
                    Requested {formatDate(request.createdAt)} · {request.reason}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={RETURN_STATUS_VARIANT[request.status]}>
                    {RETURN_STATUS_LABELS[request.status]}
                  </Badge>
                  {request.refundAmount !== null && (
                    <p className="mt-1 text-[12px] font-sans text-black">
                      Refunded {formatPrice(Number(request.refundAmount))}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {request.items.map((line) => (
                  <div key={line.id} className="flex gap-3">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-brand-ivory-deep">
                      {line.orderItem.sku.product.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.orderItem.sku.product.images[0].url}
                          alt={line.orderItem.sku.product.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-[12px] font-sans font-medium text-black">
                        {line.orderItem.sku.product.name}
                      </p>
                      <p className="text-[11px] font-sans text-[#888888]">
                        Size {line.orderItem.sku.size} · Qty {line.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {request.comment && (
                <p className="mt-4 border-t border-brand-ivory-deep pt-3 text-[12px] font-sans text-[#666666]">
                  {request.comment}
                </p>
              )}

              {isReturnCancellable(request.status) && (
                <div className="mt-4 border-t border-brand-ivory-deep pt-3">
                  <CancelReturnButton returnId={request.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AccountSection>
  );
}
