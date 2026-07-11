import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { RevenueAreaChart, HorizontalBars } from "@/components/admin/AdminCharts";
import { AdminInsights } from "@/components/admin/AdminInsights";
import type { OrderStatus } from "@/types";

const PAID: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
const STATUS_ORDER: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED",
];
const DAYS = 14;

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

async function getDashboardStats() {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (DAYS - 1));

    const [totalProducts, lowStockSkus, recentOrders, statusGroups, paidWindow, orderItems, revenueAgg] =
      await Promise.all([
        prisma.product.count({ where: { isVisible: true } }),
        prisma.sKU.findMany({
          where: { stock: { gt: 0, lte: 5 } },
          include: { product: { select: { name: true } } },
          take: 10,
        }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { user: { select: { name: true, email: true } }, items: true },
        }),
        prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.order.findMany({
          where: { status: { in: PAID }, createdAt: { gte: start } },
          select: { createdAt: true, totalAmount: true },
        }),
        prisma.orderItem.findMany({
          select: { quantity: true, sku: { select: { product: { select: { name: true } } } } },
        }),
        prisma.order.aggregate({ where: { status: { in: PAID } }, _sum: { totalAmount: true } }),
      ]);

    // Revenue over the last 14 days
    const buckets: { label: string; revenue: number }[] = [];
    const idx = new Map<string, number>();
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      idx.set(dayKey(d), buckets.length);
      buckets.push({ label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: 0 });
    }
    for (const o of paidWindow) {
      const i = idx.get(dayKey(new Date(o.createdAt)));
      if (i !== undefined) buckets[i].revenue += Number(o.totalAmount);
    }

    // Orders by status (only non-zero, canonical order)
    const statusCount = new Map(statusGroups.map((g) => [g.status, g._count._all]));
    const statusData = STATUS_ORDER.filter((s) => (statusCount.get(s) ?? 0) > 0).map((s) => ({
      label: titleCase(s),
      value: statusCount.get(s) ?? 0,
    }));

    // Top products by units sold
    const unitsByProduct = new Map<string, number>();
    for (const it of orderItems) {
      const name = it.sku.product.name;
      unitsByProduct.set(name, (unitsByProduct.get(name) ?? 0) + it.quantity);
    }
    const topProducts = [...unitsByProduct.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const totalOrders = statusGroups.reduce((s, g) => s + g._count._all, 0);
    const paidOrders = statusGroups.filter((g) => PAID.includes(g.status as OrderStatus)).reduce((s, g) => s + g._count._all, 0);

    return {
      totalProducts,
      lowStockSkus,
      recentOrders,
      revenueByDay: buckets,
      statusData,
      topProducts,
      totalOrders,
      paidOrders,
      revenue: Number(revenueAgg._sum.totalAmount ?? 0),
    };
  } catch {
    return {
      totalProducts: 0,
      lowStockSkus: [] as Array<{ id: string; skuCode: string; size: string; stock: number; product: { name: string } }>,
      recentOrders: [] as Array<{ id: string; totalAmount: unknown; status: string; createdAt: Date; user: { name: string | null; email: string | null }; items: unknown[] }>,
      revenueByDay: [] as { label: string; revenue: number }[],
      statusData: [] as { label: string; value: number }[],
      topProducts: [] as { label: string; value: number }[],
      totalOrders: 0,
      paidOrders: 0,
      revenue: 0,
    };
  }
}

export default async function AdminDashboard() {
  const s = await getDashboardStats();

  const cards = [
    { label: "Total Revenue", value: formatPrice(s.revenue), sub: "Paid orders" },
    { label: "Orders", value: String(s.totalOrders), sub: `${s.paidOrders} paid` },
    { label: "Active Products", value: String(s.totalProducts), sub: "Visible on store" },
    { label: "Low Stock SKUs", value: String(s.lowStockSkus.length), sub: "Need restocking", alert: s.lowStockSkus.length > 0 },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">Overview</p>
        <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">Dashboard</h1>
      </div>

      {/* AI insights — reads the live metrics and briefs the owner */}
      <AdminInsights />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-white p-5 border ${c.alert ? "border-brand-wine/30" : "border-brand-ivory-deep"}`}
          >
            <p className="text-[10px] font-sans tracking-luxe uppercase text-[#999] mb-2">{c.label}</p>
            <p className={`font-display text-3xl ${c.alert ? "text-brand-wine" : "text-brand-ink"}`}>{c.value}</p>
            <p className="text-[11px] font-sans text-[#999] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Panel title="Revenue" sub="Last 14 days" className="lg:col-span-2">
          <RevenueAreaChart data={s.revenueByDay} />
        </Panel>
        <Panel title="Orders by Status">
          <HorizontalBars data={s.statusData} unit="" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Panel title="Top Sellers" sub="Units sold">
          <HorizontalBars data={s.topProducts} unit="" />
        </Panel>

        <Panel title="Recent Orders" className="lg:col-span-2">
          {s.recentOrders.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <div className="divide-y divide-brand-ivory-deep">
              {s.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-[12px] font-sans font-medium text-brand-ink">
                      {order.user.name ?? order.user.email ?? "Guest"}
                    </p>
                    <p className="text-[10px] font-sans text-[#999]">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.items.length} item(s)
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <StatusPill status={order.status as OrderStatus} />
                    <p className="text-[12px] font-sans font-medium text-brand-ink w-20 text-right">
                      {formatPrice(Number(order.totalAmount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Low stock */}
      <Panel title="Low Stock Alerts" action={<Link href="/admin/inventory" className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold hover:underline">Manage</Link>}>
        {s.lowStockSkus.length === 0 ? (
          <Empty>All stock levels are healthy.</Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
            {s.lowStockSkus.map((sku) => (
              <div key={sku.id} className="flex items-center justify-between py-2 border-b border-brand-ivory-deep">
                <div>
                  <p className="text-[12px] font-sans font-medium text-brand-ink">{sku.product.name}</p>
                  <p className="text-[10px] font-sans text-[#999]">{sku.skuCode} · Size {sku.size}</p>
                </div>
                <span className="text-[11px] font-sans font-semibold text-brand-wine">{sku.stock} left</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title, sub, action, className, children,
}: {
  title: string; sub?: string; action?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`bg-white border border-brand-ivory-deep p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-brand-ink">{title}</h2>
          {sub && <p className="text-[10px] font-sans text-[#aaa] mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-sans text-[#999] py-4">{children}</p>;
}

function StatusPill({ status }: { status: OrderStatus }) {
  const paid = PAID.includes(status);
  const cls = status === "CANCELLED" || status === "RETURNED"
    ? "text-brand-wine bg-brand-wine/8"
    : status === "PENDING"
      ? "text-[#8a6d1a] bg-[#f6efd6]"
      : paid
        ? "text-[#3f6b45] bg-[#e6f0e6]"
        : "text-[#888] bg-brand-ivory-deep";
  return (
    <span className={`text-[9px] font-sans font-medium tracking-[0.15em] uppercase px-2 py-0.5 ${cls}`}>
      {titleCase(status)}
    </span>
  );
}
