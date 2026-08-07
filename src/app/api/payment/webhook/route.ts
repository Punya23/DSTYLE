import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { confirmPaidOrder } from "@/lib/orders";
import { sendOrderConfirmationEmail } from "@/lib/email";

/**
 * Only the fields this handler acts on. The signature check above is the real
 * gate — this schema exists so a shape change on Razorpay's side surfaces as a
 * clean 400 rather than an `undefined` reaching `confirmPaidOrder`.
 */
const payloadSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z
            .object({
              id: z.string().min(1),
              order_id: z.string().min(1),
              method: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Razorpay webhook (secondary, server-to-server confirmation path). Verifies
 * the RAW body against the webhook secret and idempotently confirms the order.
 * This backs up the client verify route in case the browser closes before the
 * `handler` fires.
 *
 * Configure in the Razorpay dashboard: URL `/api/payment/webhook`, event
 * `payment.captured`, secret = RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })()
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.event === "payment.captured") {
    const entity = parsed.data.payload?.payment?.entity;
    if (entity) {
      try {
        const { order, firstConfirm } = await confirmPaidOrder(
          entity.order_id,
          entity.id,
          entity.method
        );

        // This is the path that runs when the browser closed before the client
        // verify route fired — so the webhook, not verify, is the first
        // confirmer and owns the confirmation email. Best-effort: it never
        // throws, so a mail failure can't turn into a webhook retry storm.
        if (firstConfirm && order?.user?.email) {
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
      } catch (err) {
        console.error("Webhook confirm error:", err);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
