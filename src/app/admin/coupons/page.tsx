import { prisma } from "@/lib/prisma";
import { CouponManager, type AdminCoupon } from "@/components/admin/CouponManager";

/** Decimals and Dates can't cross the server→client boundary as-is. */
async function getCoupons(): Promise<AdminCoupon[]> {
  try {
    const rows = await prisma.coupon.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      type: c.type,
      value: Number(c.value),
      maxDiscount: c.maxDiscount == null ? null : Number(c.maxDiscount),
      minOrder: c.minOrder == null ? null : Number(c.minOrder),
      buyQty: c.buyQty,
      getQty: c.getQty,
      startsAt: c.startsAt?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      usageCount: c.usageCount,
      isActive: c.isActive,
      firstOrderOnly: c.firstOrderOnly,
    }));
  } catch {
    return [];
  }
}

export default async function AdminCouponsPage() {
  const coupons = await getCoupons();

  const live = coupons.filter(
    (c) => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date())
  ).length;
  const redeemed = coupons.reduce((sum, c) => sum + c.usageCount, 0);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-1">
          Promotions
        </p>
        <h1 className="font-display italic text-3xl lg:text-4xl text-brand-ink">Coupons</h1>
        <p className="text-[11px] font-sans text-[#888888] mt-1">
          {live} live · {redeemed} total redemption{redeemed === 1 ? "" : "s"}
        </p>
      </div>

      <CouponManager initial={coupons} />
    </div>
  );
}
