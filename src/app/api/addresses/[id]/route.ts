import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addressInputSchema } from "@/lib/address";

const SELECT = {
  id: true,
  name: true,
  line1: true,
  line2: true,
  city: true,
  state: true,
  pincode: true,
  phone: true,
  isDefault: true,
} as const;

type Ctx = { params: Promise<{ id: string }> };

/** Confirm the address exists and belongs to the caller. */
async function ownedAddress(userId: string, id: string) {
  return prisma.address.findFirst({ where: { id, userId, isArchived: false } });
}

/** Update a saved address (also used to flip which one is the default). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const userId = session.user.id;

  if (!(await ownedAddress(userId, id))) {
    return NextResponse.json({ error: "Address not found." }, { status: 404 });
  }

  let data;
  try {
    data = addressInputSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.update({
      where: { id },
      data: {
        name: data.name,
        line1: data.line1,
        line2: data.line2?.trim() ? data.line2.trim() : null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
        ...(data.isDefault ? { isDefault: true } : {}),
      },
      select: SELECT,
    });
  });

  return NextResponse.json({ address });
}

/**
 * Remove an address from the book. Archived rather than deleted — past orders
 * reference it, and an order should always be able to show where it shipped.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const userId = session.user.id;

  const existing = await ownedAddress(userId, id);
  if (!existing) return NextResponse.json({ error: "Address not found." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.address.update({
      where: { id },
      data: { isArchived: true, isDefault: false },
    });

    // Losing the default leaves the book without one — promote the next
    // address so checkout always has something pre-selected.
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId, isArchived: false },
        orderBy: { id: "desc" },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
