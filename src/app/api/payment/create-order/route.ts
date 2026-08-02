import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { buildCartQuote } from "@/lib/quote";
import { redeemCoupon } from "@/lib/coupons";

const addressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(4, "Valid pincode required"),
  phone: z.string().min(6, "Valid phone required"),
});

const schema = z
  .object({
    items: z
      .array(z.object({ skuId: z.string(), quantity: z.number().int().positive() }))
      .min(1, "Cart is empty"),
    /** An address already in the customer's book. Ownership is re-checked below. */
    addressId: z.string().min(1).optional(),
    /** A one-off address typed at checkout. */
    address: addressSchema.optional(),
    /** Persist a one-off address to the address book for next time. */
    saveAddress: z.boolean().optional(),
    paymentMethod: z.enum(["razorpay", "cod"]).default("razorpay"),
    /** Coupon the customer applied. Re-validated here, never trusted. */
    couponCode: z.string().trim().max(40).optional().nullable(),
  })
  .refine((v) => Boolean(v.addressId) || Boolean(v.address), {
    message: "A delivery address is required",
  });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to place an order." }, { status: 401 });
  }
  const userId = session.user.id;

  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid order data" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { items, addressId, address, saveAddress, paymentMethod, couponCode } = parsed;

  try {
    // Server-authoritative bill. Unit prices, GST, shipping and the coupon are
    // all read back from the database — no amount from the client is trusted.
    const { quote, problems, couponError, couponId } = await buildCartQuote({
      items,
      couponCode,
      userId,
      paymentMethod,
    });

    // Stock is validated as part of the quote. Anything short blocks the order
    // so the customer sees a corrected bag before money moves.
    if (problems.length > 0) {
      const first = problems[0];
      return NextResponse.json(
        {
          error:
            first.available === 0
              ? `${first.name} (${first.size}) just sold out. Please remove it from your bag.`
              : `Only ${first.available} left of ${first.name} (${first.size}). Please adjust your bag.`,
          problems,
        },
        { status: 409 }
      );
    }
    if (quote.lines.length === 0) {
      return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
    }
    // A coupon that stopped validating must not silently drop off the bill.
    if (couponCode && couponError) {
      return NextResponse.json({ error: couponError, couponRejected: true }, { status: 409 });
    }

    // Resolve the shipping address. A saved one is looked up under the
    // caller's own user id, so a forged `addressId` can't ship someone else's
    // order to an attacker's door. A typed-in address is stored either way
    // (orders reference an Address row) but only stays in the customer's book
    // when they asked to save it.
    let addr;
    if (addressId) {
      addr = await prisma.address.findFirst({
        where: { id: addressId, userId, isArchived: false },
      });
      if (!addr) {
        return NextResponse.json(
          { error: "That delivery address is no longer available." },
          { status: 400 }
        );
      }
    } else {
      addr = await prisma.address.create({
        data: {
          userId,
          name: address!.name,
          line1: address!.line1,
          line2: address!.line2 || null,
          city: address!.city,
          state: address!.state,
          pincode: address!.pincode,
          phone: address!.phone,
          isArchived: !saveAddress,
        },
      });

      // First address the customer saves becomes their default.
      if (saveAddress) {
        const others = await prisma.address.count({
          where: { userId, isArchived: false, id: { not: addr.id } },
        });
        if (others === 0) {
          await prisma.address.update({ where: { id: addr.id }, data: { isDefault: true } });
        }
      }
    }

    // Per-line snapshot: price, its share of the discount, and the GST that
    // was charged on it. Frozen here so a later rate change can't rewrite a
    // historic invoice.
    const orderItems = quote.lines.map((line) => ({
      skuId: line.skuId,
      quantity: line.quantity,
      priceSnap: line.unitPrice,
      discount: line.discount,
      taxRate: line.taxRate,
      taxAmount: line.taxAmount,
    }));

    const money = {
      subtotal: quote.subtotal,
      discountTotal: quote.discount,
      shippingTotal: quote.shipping,
      taxTotal: quote.tax,
      totalAmount: quote.total,
      couponId: couponId ?? null,
      couponCode: quote.coupon?.code ?? null,
    };

    // ---------------------------------------------------------------------
    // Cash on Delivery — confirm immediately, decrement stock atomically
    // ---------------------------------------------------------------------
    if (paymentMethod === "cod") {
      let orderId: string;
      try {
        const order = await prisma.$transaction(async (tx) => {
          for (const line of quote.lines) {
            const dec = await tx.sKU.updateMany({
              where: { id: line.skuId, isActive: true, stock: { gte: line.quantity } },
              data: { stock: { decrement: line.quantity } },
            });
            if (dec.count !== 1) throw new Error("OUT_OF_STOCK");
          }

          const created = await tx.order.create({
            data: {
              userId,
              ...money,
              addressId: addr.id,
              status: "PAID",
              paymentMethod: "COD",
              items: { create: orderItems },
              events: {
                create: { status: "PAID", message: "Order placed — cash on delivery." },
              },
            },
          });

          if (couponId) {
            await redeemCoupon(tx, {
              couponId,
              userId,
              orderId: created.id,
              amount: quote.discount,
            });
          }

          return created;
        });
        orderId = order.id;
      } catch (e) {
        if (e instanceof Error && e.message === "OUT_OF_STOCK") {
          return NextResponse.json(
            { error: "An item just went out of stock. Please review your bag." },
            { status: 409 }
          );
        }
        throw e;
      }

      // Best-effort confirmation email
      const full = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { sku: { include: { product: { select: { name: true } } } } } },
          user: { select: { email: true, name: true } },
        },
      });
      if (full?.user?.email) {
        await sendOrderConfirmationEmail({
          to: full.user.email,
          customerName: addr.name || full.user.name || "",
          orderId,
          total: quote.total,
          items: full.items.map((i) => ({
            name: i.sku.product.name,
            size: i.sku.size,
            quantity: i.quantity,
            price: Number(i.priceSnap),
          })),
        });
      }

      return NextResponse.json({ cod: true, orderId, quote });
    }

    // ---------------------------------------------------------------------
    // Razorpay — create gateway order, persist a PENDING order to confirm
    // after the client verify / webhook.
    // ---------------------------------------------------------------------
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(quote.total * 100),
      currency: "INR",
      receipt: `dstyle_${Date.now()}`,
      notes: { userId },
    });

    const order = await prisma.order.create({
      data: {
        userId,
        ...money,
        addressId: addr.id,
        razorpayOrderId: rzpOrder.id,
        items: { create: orderItems },
        events: {
          create: { status: "PENDING", message: "Order placed — awaiting payment." },
        },
      },
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      quote,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { error: "Could not place your order. Please try again." },
      { status: 500 }
    );
  }
}
