import { prisma } from "@/lib/prisma";
import { redeemCoupon } from "@/lib/coupons";

/**
 * Idempotently confirm a paid order. Safe to call from BOTH the client-side
 * verify route and the Razorpay webhook — stock is decremented exactly once
 * because the PENDING→PAID transition is atomic (`updateMany` with a
 * status guard). Subsequent calls find the order already PAID and skip
 * the decrement.
 *
 * Returns the fully-loaded order plus whether THIS call performed the first
 * confirmation (so only the first caller sends the confirmation email).
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

    if (!order) return { order: null, firstConfirm: false };

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

      for (const item of order.items) {
        await tx.sKU.update({
          where: { id: item.skuId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // A coupon is only "used up" once the order is actually paid, so an
      // abandoned Razorpay checkout never burns a customer's one redemption.
      if (order.couponId) {
        await redeemCoupon(tx, {
          couponId: order.couponId,
          userId: order.userId,
          orderId: order.id,
          amount: Number(order.discountTotal),
        });
      }

      return { order, firstConfirm: true };
    }

    return { order, firstConfirm: false };
  });
}
