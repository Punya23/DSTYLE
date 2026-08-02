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

/** List the signed-in user's saved addresses, default first. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id, isArchived: false },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    select: SELECT,
  });
  return NextResponse.json({ addresses });
}

/** Save a new address. The first one saved becomes the default automatically. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let data;
  try {
    data = addressInputSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const userId = session.user.id;
  const count = await prisma.address.count({ where: { userId, isArchived: false } });
  const makeDefault = data.isDefault || count === 0;

  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: {
        userId,
        name: data.name,
        line1: data.line1,
        line2: data.line2?.trim() ? data.line2.trim() : null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
        isDefault: makeDefault,
      },
      select: SELECT,
    });
  });

  return NextResponse.json({ address }, { status: 201 });
}
