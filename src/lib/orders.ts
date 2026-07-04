import { prisma } from "@/lib/prisma";

/**
 * Idempotently confirm a paid order. Safe to call from BOTH the client-side
 * verify route and the Razorpay webhook — stock is decremented exactly once
 * because the PENDING→CONFIRMED transition is atomic (`updateMany` with a
 * status guard). Subsequent calls find the order already CONFIRMED and skip
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
        status: "CONFIRMED",
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
      for (const item of order.items) {
        await tx.sKU.update({
          where: { id: item.skuId },
          data: { stock: { decrement: item.quantity } },
        });
      }
      return { order, firstConfirm: true };
    }

    return { order, firstConfirm: false };
  });
}
