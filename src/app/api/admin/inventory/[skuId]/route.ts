import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ stock: z.number().int().min(0) });

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
    const { stock } = schema.parse(body);

    const updated = await prisma.sKU.update({
      where: { id: skuId },
      data: { stock },
    });

    return NextResponse.json({ success: true, sku: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid stock value" }, { status: 400 });
    }
    console.error("Inventory update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
