import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { confirmPaidOrder } from "@/lib/orders";

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

  let payload: {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string; method?: string } } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event === "payment.captured") {
    const entity = payload.payload?.payment?.entity;
    if (entity?.order_id && entity?.id) {
      try {
        await confirmPaidOrder(entity.order_id, entity.id, entity.method);
      } catch (err) {
        console.error("Webhook confirm error:", err);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
