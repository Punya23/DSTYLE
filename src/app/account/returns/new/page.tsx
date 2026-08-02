import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RETURN_WINDOW_DAYS,
  formatDate,
  isReturnEligible,
  orderRef,
  returnWindowClosesAt,
} from "@/lib/account";
import { AccountSection } from "@/components/account/AccountSection";
import {
  ReturnRequestForm,
  type ReturnableItem,
} from "@/components/account/ReturnRequestForm";

export const metadata = { title: "Request a return · Dstyle" };

export default async function NewReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!orderId) redirect("/account/orders");

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: {
      returns: { select: { id: true } },
      items: {
        include: {
          sku: {
            include: {
              product: {
                select: {
                  name: true,
                  images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  if (!isReturnEligible(order, order.returns.length > 0)) {
    return (
      <AccountSection title="Request a Return">
        <div className="border border-brand-ivory-deep bg-white p-6">
          <p className="text-[12px] font-sans text-[#666666]">
            {order.returns.length > 0
              ? "This order already has a return request."
              : `Returns are open for ${RETURN_WINDOW_DAYS} days after delivery, and this order is outside that window.`}
          </p>
          <Link
            href={`/account/orders/${order.id}`}
            className="link-reveal mt-4 inline-block text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
          >
            Back to order
          </Link>
        </div>
      </AccountSection>
    );
  }

  const items: ReturnableItem[] = order.items.map((item) => ({
    id: item.id,
    productName: item.sku.product.name,
    size: item.sku.size,
    quantity: item.quantity,
    lineTotal: Number(item.priceSnap) * item.quantity,
    image: item.sku.product.images[0]?.url ?? null,
  }));

  return (
    <AccountSection
      title={`Return · Order ${orderRef(order.id)}`}
      description={`Return window closes ${formatDate(returnWindowClosesAt(order))}.`}
    >
      <ReturnRequestForm orderId={order.id} items={items} />
    </AccountSection>
  );
}
