import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { groqConfigured, groqJSON } from "@/lib/groq";
import type { OrderStatus } from "@/types";

/**
 * AI business insights for the admin dashboard.
 *
 * Gathers the store's live metrics and turns them into a short, owner-facing
 * brief: a headline, a few tagged insights (good / watch / action), and concrete
 * recommendations. Groq writes it when GROQ_API_KEY is set; otherwise a
 * rule-based brief is generated from the exact same metrics — so the dashboard is
 * genuinely useful with or without a key, pre-launch or live.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID: OrderStatus[] = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

type Tone = "good" | "watch" | "action";
type Insight = { title: string; detail: string; tone: Tone };
type Brief = { headline: string; insights: Insight[]; recommendations: string[] };

const DAYS = 14;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

async function gatherMetrics() {
  const now = new Date();
  const startThis = new Date(now);
  startThis.setHours(0, 0, 0, 0);
  startThis.setDate(startThis.getDate() - (DAYS - 1));
  const startPrev = new Date(startThis);
  startPrev.setDate(startPrev.getDate() - DAYS);

  const [
    products,
    collections,
    lowStock,
    outOfStock,
    statusGroups,
    paidAgg,
    windowOrders,
    orderItems,
    pendingCount,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { isVisible: true },
      select: { collection: { select: { name: true } }, skus: { select: { price: true } } },
    }),
    prisma.collection.findMany({ select: { name: true } }),
    prisma.sKU.count({ where: { stock: { gt: 0, lte: 5 } } }),
    prisma.sKU.count({ where: { stock: { lte: 0 } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.aggregate({ where: { status: { in: PAID } }, _sum: { totalAmount: true } }),
    prisma.order.findMany({
      where: { status: { in: PAID }, createdAt: { gte: startPrev } },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.orderItem.findMany({
      select: { quantity: true, sku: { select: { product: { select: { name: true } } } } },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
  ]);

  // Collection balance
  const perCollection = new Map<string, number>();
  for (const c of collections) perCollection.set(c.name, 0);
  const prices: number[] = [];
  for (const p of products) {
    const cname = p.collection?.name ?? "Uncategorised";
    perCollection.set(cname, (perCollection.get(cname) ?? 0) + 1);
    if (p.skus.length) prices.push(Math.min(...p.skus.map((s) => Number(s.price))));
  }

  // Revenue: this 14d window vs previous 14d
  let revThis = 0;
  let revPrev = 0;
  for (const o of windowOrders) {
    const amt = Number(o.totalAmount);
    if (new Date(o.createdAt) >= startThis) revThis += amt;
    else revPrev += amt;
  }

  // Top sellers by units
  const units = new Map<string, number>();
  for (const it of orderItems) {
    const name = it.sku.product.name;
    units.set(name, (units.get(name) ?? 0) + it.quantity);
  }
  const topSellers = [...units.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const statusCount = new Map(statusGroups.map((g) => [g.status as OrderStatus, g._count._all]));
  const totalOrders = statusGroups.reduce((s, g) => s + g._count._all, 0);
  const paidOrders = PAID.reduce((s, st) => s + (statusCount.get(st) ?? 0), 0);
  const cancelled = (statusCount.get("CANCELLED") ?? 0) + (statusCount.get("RETURNED") ?? 0);
  const totalRevenue = Number(paidAgg._sum.totalAmount ?? 0);

  return {
    productCount: products.length,
    collectionBalance: Object.fromEntries(perCollection),
    priceRange: prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : { min: 0, max: 0 },
    lowStockVariants: lowStock,
    outOfStockVariants: outOfStock,
    totalOrders,
    paidOrders,
    pendingOrders: pendingCount,
    cancelledOrReturned: cancelled,
    totalRevenue,
    avgOrderValue: paidOrders ? Math.round(totalRevenue / paidOrders) : 0,
    revenueLast14: revThis,
    revenuePrev14: revPrev,
    revenueTrendPct:
      revPrev > 0 ? Math.round(((revThis - revPrev) / revPrev) * 100) : revThis > 0 ? 100 : 0,
    topSellers,
  };
}

type Metrics = Awaited<ReturnType<typeof gatherMetrics>>;

/** Deterministic brief from the metrics — the always-available baseline. */
function ruleBasedBrief(m: Metrics): Brief {
  const insights: Insight[] = [];
  const recommendations: string[] = [];
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  const preLaunch = m.totalOrders === 0;

  if (preLaunch) {
    insights.push({
      title: "Catalogue ready",
      detail: `${m.productCount} pieces are live across your collections, priced ${inr(m.priceRange.min)}–${inr(m.priceRange.max)}.`,
      tone: "good",
    });
  } else {
    const t = m.revenueTrendPct;
    insights.push({
      title: t >= 0 ? "Revenue trending up" : "Revenue softening",
      detail: `${inr(m.revenueLast14)} in the last 14 days, ${t >= 0 ? "+" : ""}${t}% vs the prior 14.`,
      tone: t >= 0 ? "good" : "watch",
    });
    insights.push({
      title: "Average order value",
      detail: `${inr(m.avgOrderValue)} across ${m.paidOrders} paid order(s).`,
      tone: "good",
    });
    if (m.topSellers[0]) {
      insights.push({
        title: "Best seller",
        detail: `${m.topSellers[0].name} leads with ${m.topSellers[0].qty} unit(s) sold.`,
        tone: "good",
      });
    }
  }

  // Collection balance (both states)
  const entries = Object.entries(m.collectionBalance);
  if (entries.length > 1) {
    const sorted = [...entries].sort((a, b) => a[1] - b[1]);
    const [thinName, thinCount] = sorted[0];
    const [fatName, fatCount] = sorted[sorted.length - 1];
    if (fatCount - thinCount >= 3) {
      insights.push({
        title: "Uneven collections",
        detail: `${thinName} has only ${thinCount} piece(s) vs ${fatCount} in ${fatName}.`,
        tone: "watch",
      });
      recommendations.push(`Add a few pieces to ${thinName} so every collection feels complete.`);
    }
  }

  if (m.outOfStockVariants > 0) {
    insights.push({
      title: "Out of stock",
      detail: `${m.outOfStockVariants} variant(s) are at zero stock and can't be bought.`,
      tone: "action",
    });
    recommendations.push("Restock or hide the out-of-stock variants so shoppers don't hit dead ends.");
  }
  if (m.lowStockVariants > 0) {
    insights.push({
      title: "Low stock",
      detail: `${m.lowStockVariants} variant(s) have 5 or fewer left.`,
      tone: "watch",
    });
  }
  if (m.pendingOrders > 0) {
    insights.push({
      title: "Orders awaiting action",
      detail: `${m.pendingOrders} order(s) are still pending confirmation.`,
      tone: "action",
    });
    recommendations.push(`Confirm the ${m.pendingOrders} pending order(s) to keep fulfilment moving.`);
  }

  if (preLaunch) {
    recommendations.push("Add your payment, image-host and pooled database keys, then open the store.");
    recommendations.push("Feature a few hero pieces and share the New Arrivals link to drive first visits.");
  }

  const headline = preLaunch
    ? `Store is stocked and ready — ${m.productCount} pieces live, no orders yet.`
    : `${inr(m.totalRevenue)} earned across ${m.paidOrders} paid order(s); ${m.pendingOrders} pending.`;

  return { headline, insights: insights.slice(0, 6), recommendations: recommendations.slice(0, 4) };
}

async function aiBrief(m: Metrics): Promise<Brief | null> {
  const system = `You are the business analyst for Dstyle, a luxury Indian couture house. You read the store's metrics and brief the owner like a sharp, calm advisor: specific, tied to the numbers, no filler, no hype. Amounts are in Indian rupees. If there are no orders yet, treat it as pre-launch and focus on catalogue readiness, stock, collection balance, and launch steps. Every insight must reference an actual figure from the data. Keep it scannable.

Respond ONLY with a JSON object of exactly this shape, nothing else:
{
  "headline": string,                                  // one punchy, specific sentence
  "insights": [                                        // 3–5 items, each tied to a real figure
    { "title": string, "detail": string, "tone": "good" | "watch" | "action" }
  ],
  "recommendations": string[]                          // 2–4 concrete next steps, most impactful first
}
tone: good = healthy, watch = keep an eye on, action = do something now.`;

  const parsed = await groqJSON<Brief>({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `Here are the current store metrics as JSON. Write the brief.\n\n${JSON.stringify(m, null, 2)}`,
      },
    ],
    temperature: 0.4,
    maxTokens: 900,
  });

  if (!parsed?.headline || !Array.isArray(parsed.insights)) return null;
  // Clamp tones to the allowed set defensively.
  parsed.insights = parsed.insights
    .filter((i) => i && i.title && i.detail)
    .map((i) => ({ ...i, tone: (["good", "watch", "action"] as Tone[]).includes(i.tone) ? i.tone : "watch" }))
    .slice(0, 6);
  parsed.recommendations = (parsed.recommendations ?? []).filter(Boolean).slice(0, 4);
  return parsed;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const metrics = await gatherMetrics();

    let brief: Brief | null = null;
    let source: "ai" | "rules" = "rules";
    if (groqConfigured()) {
      brief = await aiBrief(metrics);
      if (brief) source = "ai";
    }
    if (!brief) brief = ruleBasedBrief(metrics);

    return NextResponse.json({ source, brief, metrics: { totalRevenue: metrics.totalRevenue } });
  } catch (err) {
    console.error("[insights] error:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
