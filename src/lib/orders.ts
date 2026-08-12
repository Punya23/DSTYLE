import { prisma } from "@/lib/prisma";
import { redeemCoupon } from "@/lib/coupons";

/**
 * Idempotently confirm a paid order. Safe to call from BOTH the client-side
 * verify route and the Razorpay webhook — stock is decremented exactly once
 * because the PENDING→PAID transition is atomic (`updateMany` with a
 * status guard). Subsequent calls find the order already PAID and skip
 * the decrement.
 *
 * Returns the fully-loaded order, whether THIS call performed the first
 * confirmation (so only the first caller sends the confirmation email), and a
 * list of any lines that could not be reserved — see the decrement below.
 */
export async function confirmPaidOrder(
  razorpayOrderId: string,
  paymentId: string,
  method?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const transitioned = await tx.order.updateMany({
      where: { razorpayOrderId, status: "PENDING" },
      data: {
        status: "PAID",
        razorpayPaymentId: paymentId,
        paymentMethod: method ?? undefined,
      },
    });

    const order = await tx.order.findFirst({
      where: { razorpayOrderId },
      include: {
        items: {
          include: {
            sku: { include: { product: { select: { name: true, slug: true } } } },
          },
        },
        user: { select: { email: true, name: true } },
        address: true,
      },
    });

    if (!order) return { order: null, firstConfirm: false, oversold: [] as string[] };

    // Only the first successful transition decrements stock.
    if (transitioned.count === 1) {
      // Same guard makes this exactly-once, so the tracking timeline never
      // shows a duplicate "Confirmed" row when the webhook and the verify
      // route both land.
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: "PAID",
          message: "Payment received. Your order is confirmed.",
        },
      });

      /**
       * Conditional decrement, matching the COD path in
       * `/api/payment/create-order`.
       *
       * The gateway path holds no stock while the shopper is on Razorpay's
       * payment sheet, and that window is minutes long — card entry plus OTP.
       * For a catalogue where most SKUs are one-of-one, two people can easily
       * both pay for the last piece. An unconditional `decrement` drove `stock`
       * negative and said nothing.
       *
       * The money is already captured by the time this runs, so a shortfall
       * must not throw: rolling back would leave the order PENDING despite a
       * successful charge, which is strictly worse. Instead the transition
       * stands and the shortfall is written to the order timeline, where the
       * admin order view already renders every event — so an oversell surfaces
       * as an item to refund rather than as silent negative inventory.
       */
      const oversold: string[] = [];
      for (const item of order.items) {
        const dec = await tx.sKU.updateMany({
          where: { id: item.skuId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (dec.count !== 1) {
          oversold.push(`${item.sku.product.name} (${item.sku.size ?? "one size"}) ×${item.quantity}`);
        }
      }

      if (oversold.length > 0) {
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            status: "PAID",
            message:
              `ACTION REQUIRED — paid but out of stock: ${oversold.join(", ")}. ` +
              `Refund or offer an alternative before dispatch.`,
          },
        });
      }

      // A coupon is only "used up" once the order is actually paid, so an
      // abandoned Razorpay checkout never burns a customer's one redemption.
      // `redeemCoupon` is also where the usage cap is actually enforced; a
      // `false` here means the code was exhausted between quote and payment,
      // which is again a refund decision rather than something to throw over.
      if (order.couponId) {
        const redeemed = await redeemCoupon(tx, {
          couponId: order.couponId,
          userId: order.userId,
          orderId: order.id,
          amount: Number(order.discountTotal),
        });
        if (!redeemed) {
          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              status: "PAID",
              message:
                `Coupon ${order.couponCode ?? order.couponId} was fully redeemed before this ` +
                `payment completed — the discount was still honoured on this order.`,
            },
          });
        }
      }

      return { order, firstConfirm: true, oversold };
    }

    return { order, firstConfirm: false, oversold: [] as string[] };
  });
}
