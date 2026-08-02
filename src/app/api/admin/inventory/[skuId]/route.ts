import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Stock is the usual edit; `isActive` is the manual kill-switch for pulling a
 * size that still has units on the shelf. Zero stock already disables a size
 * on its own, so that case needs no flag.
 */
const schema = z
  .object({
    stock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    lowStockAt: z.number().int().min(0).optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: "Nothing to update",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { skuId } = await params;
    const body = await req.json();
    const data = schema.parse(body);

    const updated = await prisma.sKU.update({
      where: { id: skuId },
      data,
    });

    return NextResponse.json({ success: true, sku: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid stock value" },
        { status: 400 }
      );
    }
    console.error("Inventory update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
