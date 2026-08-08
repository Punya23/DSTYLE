import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength, PASSWORD_MIN_LENGTH } from "@/lib/password";
import { issueVerificationEmail } from "@/lib/verification";
import { enforceRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`),
});

/**
 * Create a password account. The account is unusable until the address is
 * verified — that is what stops anyone registering an email they don't own.
 */
export async function POST(req: NextRequest) {
  // Every accepted registration sends a verification email; unbounded, this is a
  // free mail cannon pointed at arbitrary inboxes.
  const limited = await enforceRateLimit(req, "authWrite");
  if (limited) return limited;

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  const { name, email, password } = parsed;

  const strengthError = validatePasswordStrength(password);
  if (strengthError) return NextResponse.json({ error: strengthError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 }
      );
    }

    // A registration that never confirmed its address. Resend the link rather
    // than dead-ending, but deliberately do NOT overwrite the stored password:
    // whoever registered first may be the rightful owner, and letting a second
    // submission replace their password would be a takeover primitive.
    if (existing.passwordHash) {
      await issueVerificationEmail(email);
      return NextResponse.json({
        ok: true,
        message: "That email is already registered — we've re-sent the verification link.",
      });
    }

    // Row exists with no password at all (a magic-link sign-in that was
    // started but never completed). Safe to attach a password now; it still
    // can't be used until the address is verified.
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash: await hashPassword(password) },
    });
    await issueVerificationEmail(email);
    return NextResponse.json({ ok: true });
  }

  await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await issueVerificationEmail(email);

  return NextResponse.json({ ok: true });
}
