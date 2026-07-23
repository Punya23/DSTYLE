import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/types";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";

type OrderRow = Awaited<ReturnType<typeof prisma.order.findMany<{
  include: {
    user: { select: { name: true; email: true; phone: true } };
    items: { include: { sku: { include: { product: { select: { name: true } } } } } };
    address: true;
  };
}>>>[number];

async function getOrders(): Promise<OrderRow[]> {
  try {
    return await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { sku: { include: { product: { select: { name: true } } } } } },
        address: true,
      },
    });
  } catch {
    return [];
  }
}

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">Fulfilment</p>
        <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">Orders</h1>
      </div>

      <div className="bg-white border border-[#e0e0e0] overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-[#e0e0e0]">
            <tr>
              {["Order ID", "Customer", "Items", "Total", "Status", "Date"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[10px] font-sans font-medium tracking-widest uppercase text-[#888888]"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-[12px] font-sans text-[#888888]"
                >
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#f5f5f5] hover:bg-[#f5f5f5] transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-[11px] font-mono text-[#888888]">
                      #{order.id.slice(-8).toUpperCase()}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-sans font-medium text-black">
                      {order.user.name ?? "Guest"}
                    </p>
                    <p className="text-[10px] font-sans text-[#888888]">
                      {order.user.email ?? order.user.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {order.items.slice(0, 2).map((item) => (
                        <p key={item.id} className="text-[11px] font-sans text-[#888888]">
                          {item.sku.product.name} · {item.sku.size} × {item.quantity}
                        </p>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-[10px] font-sans text-[#888888]">
                          +{order.items.length - 2} more
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-sans font-medium text-black">
                    {formatPrice(Number(order.totalAmount))}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect
                      orderId={order.id}
                      currentStatus={order.status as OrderStatus}
                    />
                  </td>
                  <td className="px-4 py-3 text-[11px] font-sans text-[#888888]">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
