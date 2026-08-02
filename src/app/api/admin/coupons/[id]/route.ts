import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/coupons";
import { couponSchema, validateCouponRules } from "@/lib/coupon-schema";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "STAFF";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const data = couponSchema.parse(await req.json());
    const ruleError = validateCouponRules(data);
    if (ruleError) return NextResponse.json({ error: ruleError }, { status: 400 });

    const coupon = await prisma.coupon.update({
      where: { id },
      // `usageCount` is deliberately not writable here — it is owned by the
      // redemption path and editing a coupon must not reset how often it ran.
      data: { ...data, code: normalizeCode(data.code) },
    });
    return NextResponse.json({ coupon });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid coupon" },
        { status: 400 }
      );
    }
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "A coupon with that code already exists." },
        { status: 409 }
      );
    }
    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    console.error("Update coupon error:", err);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

/**
 * Deactivate rather than delete when a coupon has already been redeemed —
 * past orders reference it, and the redemption history is an audit trail.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const redemptions = await prisma.couponRedemption.count({ where: { couponId: id } });

    if (redemptions > 0) {
      await prisma.coupon.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ ok: true, deactivated: true });
    }

    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ ok: true, deactivated: false });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    console.error("Delete coupon error:", err);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
