import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildCartQuote } from "@/lib/quote";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Price the cart. The client holds nothing but SKU ids and quantities; every
 * rupee shown in the drawer and at checkout comes from here, so the figure the
 * customer sees is the figure the order is created with.
 */

const schema = z.object({
  items: z
    .array(
      z.object({
        skuId: z.string().min(1),
        quantity: z.number().int().positive().max(99),
      })
    )
    .max(100),
  couponCode: z.string().trim().max(40).optional().nullable(),
  paymentMethod: z.enum(["razorpay", "cod"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  // Unauthenticated and DB-touching: one call runs a store-settings read, a
  // SKU lookup over up to 100 ids, and the whole coupon engine. It was the only
  // route in the app without a ceiling. Scoped by user id where there is one,
  // so a shared NAT doesn't throttle everyone behind it.
  const limited = await enforceRateLimit(req, "read", session?.user?.id);
  if (limited) return limited;

  let body;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const { quote, problems, couponError } = await buildCartQuote({
      items: body.items,
      couponCode: body.couponCode ?? null,
      userId: session?.user?.id ?? null,
      paymentMethod: body.paymentMethod ?? "razorpay",
    });

    return NextResponse.json({ quote, problems, couponError });
  } catch (err) {
    console.error("Cart quote error:", err);
    return NextResponse.json({ error: "Could not price your bag." }, { status: 500 });
  }
}
