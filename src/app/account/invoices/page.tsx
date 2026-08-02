import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import {
  INVOICEABLE_STATUSES,
  ORDER_STATUS_LABELS,
  formatDate,
  invoiceNumber,
  orderRef,
} from "@/lib/account";
import { AccountSection, EmptyState } from "@/components/account/AccountSection";

export const metadata = { title: "Invoices · Dstyle" };

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  let orders: Awaited<ReturnType<typeof prisma.order.findMany>> = [];
  try {
    orders = await prisma.order.findMany({
      where: { userId: session.user.id, status: { in: INVOICEABLE_STATUSES } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    orders = [];
  }

  return (
    <AccountSection
      title="Invoices"
      description="One invoice per paid order. Open it to print or save as PDF."
    >
      {orders.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          ctaHref="/collections"
          ctaLabel="Browse the collections"
        />
      ) : (
        <div className="overflow-x-auto border border-brand-ivory-deep bg-white">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-brand-ivory-deep">
                {["Invoice", "Order", "Date", "Status", "Amount", ""].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-[10px] font-sans tracking-luxe uppercase text-[#888888]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-brand-ivory-deep last:border-0">
                  <td className="px-5 py-4 font-mono text-[11px] text-black">
                    {invoiceNumber(order)}
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] text-[#888888]">
                    {orderRef(order.id)}
                  </td>
                  <td className="px-5 py-4 text-[12px] font-sans text-[#666666]">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-[12px] font-sans text-[#666666]">
                    {ORDER_STATUS_LABELS[order.status]}
                  </td>
                  <td className="px-5 py-4 text-[12px] font-sans font-medium text-black">
                    {formatPrice(Number(order.totalAmount))}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/account/invoices/${order.id}`}
                      className="text-[10px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AccountSection>
  );
}
