import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const schema = z.object({
  status: z.enum([
    "REQUESTED",
    "APPROVED",
    "REJECTED",
    "PICKED_UP",
    "RECEIVED",
    "REFUNDED",
    "CANCELLED",
  ]),
  refundAmount: z.number().nonnegative().optional(),
});

/** Staff-side progression of a return request. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await req.json());

    const data: Prisma.ReturnRequestUpdateInput = { status: body.status };
    if (body.refundAmount !== undefined) data.refundAmount = body.refundAmount;

    // REFUNDED / REJECTED / CANCELLED are end states — stamp when we got there.
    if (["REFUNDED", "REJECTED", "CANCELLED"].includes(body.status)) {
      data.resolvedAt = new Date();
    }

    const request = await prisma.returnRequest.update({ where: { id }, data });

    // A refunded return is also the order's own end state, and the customer's
    // order history should say so.
    if (body.status === "REFUNDED") {
      await prisma.order.update({
        where: { id: request.orderId },
        data: { status: "REFUNDED" },
      });
      await prisma.orderEvent.create({
        data: {
          orderId: request.orderId,
          status: "REFUNDED",
          message: "Return received and refunded.",
        },
      });
    }

    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    console.error("Update return error:", err);
    return NextResponse.json({ error: "Failed to update return" }, { status: 500 });
  }
}
