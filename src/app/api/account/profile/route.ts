import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

/** Update the signed-in user's display name and contact number. */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const phone = parsed.phone?.trim() ? parsed.phone.trim() : null;

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.name, phone },
      select: { name: true, phone: true, email: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    // `phone` is unique — the only realistic failure here is another account
    // already holding this number.
    return NextResponse.json(
      { error: "That phone number is already linked to another account." },
      { status: 409 }
    );
  }
}
