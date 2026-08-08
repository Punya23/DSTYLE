import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Ids are cuids; anything else can't match a row, so reject it before querying. */
const paramsSchema = z.object({ id: z.string().cuid() });

/** Delete one of the caller's own reviews. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  const { id } = parsed.data;

  // deleteMany (not delete) so the ownership filter is part of the statement —
  // a review id alone can never delete someone else's review.
  const { count } = await prisma.review.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (count === 0) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
