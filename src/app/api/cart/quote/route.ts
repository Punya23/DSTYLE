import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildCartQuote } from "@/lib/quote";

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
