import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { formatDate, orderRef } from "@/lib/account";
import { ReturnStatusSelect } from "@/components/admin/ReturnStatusSelect";

async function getReturns() {
  try {
    return await prisma.returnRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            orderItem: {
              include: { sku: { include: { product: { select: { name: true } } } } },
            },
          },
        },
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminReturnsPage() {
  const returns = await getReturns();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <p className="mb-1 text-[10px] font-sans tracking-luxe uppercase text-brand-gold">
          After-sales
        </p>
        <h1 className="font-display italic text-3xl text-brand-ink lg:text-4xl">Returns</h1>
      </div>

      <div className="overflow-x-auto border border-[#e0e0e0] bg-white">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-[#e0e0e0]">
            <tr>
              {["Order", "Customer", "Items", "Reason", "Refund", "Status", "Raised"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-sans font-medium tracking-widest uppercase text-[#888888]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-[12px] font-sans text-[#888888]"
                >
                  No return requests.
                </td>
              </tr>
            ) : (
              returns.map((request) => {
                const refundable = request.items.reduce(
                  (sum, line) => sum + Number(line.orderItem.priceSnap) * line.quantity,
                  0
                );

                return (
                  <tr key={request.id} className="border-b border-[#f5f5f5]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders`}
                        className="font-mono text-[11px] text-[#888888] hover:text-brand-gold"
                      >
                        {orderRef(request.orderId)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-sans font-medium text-black">
                        {request.user.name ?? "—"}
                      </p>
                      <p className="text-[10px] font-sans text-[#888888]">{request.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {request.items.map((line) => (
                        <p key={line.id} className="text-[11px] font-sans text-[#888888]">
                          {line.orderItem.sku.product.name} · {line.orderItem.sku.size} ×{" "}
                          {line.quantity}
                        </p>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-sans text-black">{request.reason}</p>
                      {request.comment && (
                        <p className="mt-0.5 text-[10px] font-sans text-[#888888]">
                          {request.comment}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-sans text-black">
                      {formatPrice(
                        request.refundAmount !== null ? Number(request.refundAmount) : refundable
                      )}
                      {request.refundAmount === null && (
                        <span className="block text-[10px] text-[#888888]">estimated</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ReturnStatusSelect
                        returnId={request.id}
                        currentStatus={request.status}
                        suggestedRefund={refundable}
                      />
                    </td>
                    <td className="px-4 py-3 text-[11px] font-sans text-[#888888]">
                      {formatDate(request.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
