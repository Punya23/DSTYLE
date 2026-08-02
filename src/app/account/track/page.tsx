import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS, ORDER_STATUS_VARIANT, formatDate, orderRef } from "@/lib/account";
import { Badge } from "@/components/ui/badge";
import { AccountSection } from "@/components/account/AccountSection";
import { TrackOrderForm } from "@/components/account/TrackOrderForm";

export const metadata = { title: "Track Order · Dstyle" };

export default async function TrackOrderPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  let inTransit: {
    id: string;
    status: "PAID" | "PACKED" | "SHIPPED";
    createdAt: Date;
    carrier: string | null;
    trackingNumber: string | null;
  }[] = [];

  try {
    inTransit = (await prisma.order.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["PAID", "PACKED", "SHIPPED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        carrier: true,
        trackingNumber: true,
      },
    })) as typeof inTransit;
  } catch {
    inTransit = [];
  }

  return (
    <div className="space-y-12">
      <AccountSection
        title="On the way"
        description="Orders that have been paid for but not delivered yet."
      >
        {inTransit.length === 0 ? (
          <p className="border border-brand-ivory-deep bg-white p-6 text-[12px] font-sans text-[#888888]">
            Nothing in transit right now.
          </p>
        ) : (
          <div className="space-y-3">
            {inTransit.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}#tracking`}
                className="flex flex-wrap items-center justify-between gap-3 border border-brand-ivory-deep bg-white p-5 transition-colors hover:border-brand-gold"
              >
                <div>
                  <p className="font-mono text-[11px] text-black">{orderRef(order.id)}</p>
                  <p className="mt-0.5 text-[11px] font-sans text-[#888888]">
                    Placed {formatDate(order.createdAt)}
                    {order.trackingNumber
                      ? ` · ${order.carrier ?? "Courier"} ${order.trackingNumber}`
                      : ""}
                  </p>
                </div>
                <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </AccountSection>

      <AccountSection
        title="Look up any order"
        description="Use the reference from your confirmation email."
      >
        <TrackOrderForm defaultEmail={session.user.email ?? ""} />
      </AccountSection>
    </div>
  );
}
