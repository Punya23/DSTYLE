import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isReturnCancellable } from "@/lib/account";

/** Ids are cuids; anything else can't match a row, so reject it before querying. */
const paramsSchema = z.object({ id: z.string().cuid() });

/**
 * Customer-side cancellation of their own return request. The row is kept
 * (status CANCELLED) rather than deleted so the order keeps its history — and
 * so a cancelled request doesn't silently re-open the return window.
 */
export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const parsed = paramsSchema.safeParse(await ctx.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Return request not found." }, { status: 404 });
  }
  const { id } = parsed.data;

  const existing = await prisma.returnRequest.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Return request not found." }, { status: 404 });
  }

  if (!isReturnCancellable(existing.status)) {
    return NextResponse.json(
      { error: "This return has moved too far along to cancel — contact us instead." },
      { status: 409 }
    );
  }

  await prisma.returnRequest.update({
    where: { id },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
