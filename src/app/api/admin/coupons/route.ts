import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/coupons";
import { couponSchema, validateCouponRules } from "@/lib/coupon-schema";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "STAFF";
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const coupons = await prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    coupons: coupons.map((c) => ({
      ...c,
      value: Number(c.value),
      maxDiscount: c.maxDiscount == null ? null : Number(c.maxDiscount),
      minOrder: c.minOrder == null ? null : Number(c.minOrder),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = couponSchema.parse(await req.json());
    const ruleError = validateCouponRules(data);
    if (ruleError) return NextResponse.json({ error: ruleError }, { status: 400 });

    const coupon = await prisma.coupon.create({
      data: { ...data, code: normalizeCode(data.code) },
    });
    return NextResponse.json({ coupon }, { status: 201 });
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
    console.error("Create coupon error:", err);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
