import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken, generateResetToken } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/auth-emails";
import { appUrl } from "@/lib/app-url";

const RESET_TTL_MS = 60 * 60 * 1000;
/** Ignore repeat requests inside this window so the inbox can't be flooded. */
const RESEND_COOLDOWN_MS = 60 * 1000;

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Start a password reset. The response is identical whether or not the address
 * exists — otherwise this endpoint becomes an account-enumeration oracle.
 */
export async function POST(req: NextRequest) {
  let email: string;
  try {
    email = bodySchema.parse(await req.json()).email;
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const generic = NextResponse.json({
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  });

  const user = await prisma.user.findUnique({ where: { email } });
  // Only accounts that actually have a password can reset one. Magic-link and
  // Google-only users are told the same thing but get no mail — there is
  // nothing to reset.
  if (!user?.passwordHash) return generic;

  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
  });
  if (recent) return generic;

  // Invalidate any outstanding links so only the newest one works.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = generateResetToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  try {
    await sendPasswordResetEmail(email, appUrl(`/reset-password?token=${raw}`));
  } catch (err) {
    // Don't leak delivery failures to the caller (it would still reveal that
    // the account exists), but make them visible in the server logs.
    console.error("[forgot-password] send failed", err);
  }

  return generic;
}
