import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { confirmPaidOrder } from "@/lib/orders";
import { sendOrderConfirmationEmail } from "@/lib/email";

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/**
 * Called by the Razorpay Checkout `handler` on the client after a successful
 * payment. This is the AUTHORITATIVE confirmation path — the client success
 * screen must not be trusted until this verifies the signature server-side and
 * flips the order to CONFIRMED.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data;
  try {
    data = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const valid = verifyPaymentSignature(
    data.razorpay_order_id,
    data.razorpay_payment_id,
    data.razorpay_signature
  );
  if (!valid) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  try {
    const { order, firstConfirm } = await confirmPaidOrder(
      data.razorpay_order_id,
      data.razorpay_payment_id
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Send the confirmation email once, best-effort (never blocks success).
    if (firstConfirm && order.user?.email) {
      await sendOrderConfirmationEmail({
        to: order.user.email,
        customerName: order.address?.name || order.user.name || "",
        orderId: order.id,
        total: Number(order.totalAmount),
        items: order.items.map((i) => ({
          name: i.sku.product.name,
          size: i.sku.size,
          quantity: i.quantity,
          price: Number(i.priceSnap),
        })),
      });
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Could not confirm order" }, { status: 500 });
  }
}
