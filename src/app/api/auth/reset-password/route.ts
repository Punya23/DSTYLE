import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  hashToken,
  validatePasswordStrength,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password";
import { sendPasswordChangedEmail } from "@/lib/auth-emails";
import { enforceRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(PASSWORD_MIN_LENGTH),
});

const INVALID = "This reset link is invalid or has expired. Request a new one.";

/** Redeem a reset link and set a new password. Single use. */
export async function POST(req: NextRequest) {
  // Reset tokens are high-entropy, but an unbounded endpoint still lets someone
  // grind them and burns a DB lookup per attempt.
  const limited = await enforceRateLimit(req, "authWrite");
  if (limited) return limited;

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const strengthError = validatePasswordStrength(parsed.password);
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.token) },
    include: { user: true },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.password);

  // Claim the token first, conditionally on it still being unused. Two
  // concurrent redemptions race here and exactly one wins; the loser never
  // reaches the password write.
  const claim = await prisma.passwordResetToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        passwordHash,
        // Redeeming a link sent to this address proves ownership of it.
        ...(row.user.emailVerified ? {} : { emailVerified: new Date() }),
      },
    }),
    // Any other outstanding links for this account are now stale.
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  if (row.user.email) {
    try {
      await sendPasswordChangedEmail(row.user.email);
    } catch (err) {
      console.error("[reset-password] notice email failed", err);
    }
  }

  return NextResponse.json({ ok: true });
}
