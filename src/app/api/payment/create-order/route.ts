import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";

const SHIPPING_FLAT = 299;
const FREE_SHIPPING_THRESHOLD = 5000;

const addressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(4, "Valid pincode required"),
  phone: z.string().min(6, "Valid phone required"),
});

const schema = z.object({
  items: z
    .array(z.object({ skuId: z.string(), quantity: z.number().int().positive() }))
    .min(1, "Cart is empty"),
  address: addressSchema,
  paymentMethod: z.enum(["razorpay", "cod"]).default("razorpay"),
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

  const { items, address, paymentMethod } = parsed;

  try {
    const skus = await prisma.sKU.findMany({
      where: { id: { in: items.map((i) => i.skuId) } },
    });

    // Server-authoritative stock validation
    for (const item of items) {
      const sku = skus.find((s) => s.id === item.skuId);
      if (!sku) {
        return NextResponse.json({ error: "One of your items is no longer available." }, { status: 400 });
      }
      if (sku.stock < item.quantity) {
        return NextResponse.json(
          { error: `Only ${sku.stock} left of ${sku.skuCode}. Please adjust your cart.` },
          { status: 409 }
        );
      }
    }

    // Server-authoritative pricing (never trust client amounts)
    const subtotal = items.reduce((sum, item) => {
      const sku = skus.find((s) => s.id === item.skuId)!;
      return sum + Number(sku.price) * item.quantity;
    }, 0);
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
    const total = subtotal + shipping;

    // Persist the shipping address for this user
    const addr = await prisma.address.create({
      data: {
        userId,
        name: address.name,
        line1: address.line1,
        line2: address.line2 || null,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
      },
    });

    const orderItems = items.map((item) => {
      const sku = skus.find((s) => s.id === item.skuId)!;
      return { skuId: item.skuId, quantity: item.quantity, priceSnap: sku.price };
    });

    // ---------------------------------------------------------------------
    // Cash on Delivery — confirm immediately, decrement stock atomically
    // ---------------------------------------------------------------------
    if (paymentMethod === "cod") {
      let orderId: string;
      try {
        const order = await prisma.$transaction(async (tx) => {
          for (const item of items) {
            const dec = await tx.sKU.updateMany({
              where: { id: item.skuId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (dec.count !== 1) throw new Error("OUT_OF_STOCK");
          }
          return tx.order.create({
            data: {
              userId,
              totalAmount: total,
              addressId: addr.id,
              status: "CONFIRMED",
              paymentMethod: "COD",
              items: { create: orderItems },
            },
          });
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
          customerName: address.name || full.user.name || "",
          orderId,
          total,
          items: full.items.map((i) => ({
            name: i.sku.product.name,
            size: i.sku.size,
            quantity: i.quantity,
            price: Number(i.priceSnap),
          })),
        });
      }

      return NextResponse.json({ cod: true, orderId });
    }

    // ---------------------------------------------------------------------
    // Razorpay — create gateway order, persist a PENDING order to confirm
    // after the client verify / webhook.
    // ---------------------------------------------------------------------
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: `dstyle_${Date.now()}`,
      notes: { userId },
    });

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount: total,
        addressId: addr.id,
        razorpayOrderId: rzpOrder.id,
        items: { create: orderItems },
      },
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { error: "Could not place your order. Please try again." },
      { status: 500 }
    );
  }
}
