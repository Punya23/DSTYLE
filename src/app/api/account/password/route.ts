import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password";
import { sendPasswordChangedEmail } from "@/lib/auth-emails";

const bodySchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});

/**
 * Change (or, for magic-link/Google accounts, set for the first time) the
 * signed-in user's password.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const strengthError = validatePasswordStrength(parsed.newPassword);
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  // An account that already has a password must prove it knows the old one —
  // otherwise a stolen session becomes a permanent account takeover.
  if (user.passwordHash) {
    const current = parsed.currentPassword ?? "";
    if (!current || !(await verifyPassword(current, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    if (await verifyPassword(parsed.newPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "New password must be different from the current one." },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.newPassword),
      // Setting a password from an authenticated session is itself proof of
      // control; magic-link and Google users are already verified anyway.
      ...(user.emailVerified ? {} : { emailVerified: new Date() }),
    },
  });

  // Any outstanding reset links are stale now.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (user.email) {
    try {
      await sendPasswordChangedEmail(user.email);
    } catch (err) {
      console.error("[account/password] notice email failed", err);
    }
  }

  return NextResponse.json({ ok: true, hadPassword: Boolean(user.passwordHash) });
}
