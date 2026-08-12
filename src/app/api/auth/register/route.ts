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

  /**
   * Sending must never fail the registration.
   *
   * `issueVerificationEmail` throws when the mail provider rejects the send —
   * and it will: while the sending domain is unverified, Resend runs in sandbox
   * mode and 403s for every recipient except the account owner. Unhandled, that
   * threw out of this handler as a 500 *after* the `User` row was already
   * written, so the customer saw "couldn't create your account" and then could
   * never register again: the row exists, so every retry lands in the branch
   * above it. A permanent lockout on the sign-up form, on launch day.
   *
   * The sibling routes (`forgot-password`, `resend-verification`) already
   * swallow this; registration was the one that did not.
   */
  async function sendVerification(): Promise<boolean> {
    try {
      await issueVerificationEmail(email);
      return true;
    } catch (err) {
      console.error(`[register] verification email to ${email} failed:`, err);
      return false;
    }
  }

  const emailFailedMessage =
    "Your account is ready, but we couldn't send the verification email just now. " +
    "Use “Resend verification” in a moment, or contact us if it keeps failing.";

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
      const sent = await sendVerification();
      return NextResponse.json({
        ok: true,
        // Same wording as a brand-new registration on purpose: the previous
        // copy ("that email is already registered") told an attacker walking a
        // list exactly which addresses hold half-finished accounts.
        message: sent
          ? "Check your inbox to finish setting up your account."
          : emailFailedMessage,
      });
    }

    // Row exists with no password at all (a magic-link sign-in that was
    // started but never completed). Safe to attach a password now; it still
    // can't be used until the address is verified.
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash: await hashPassword(password) },
    });
    const sent = await sendVerification();
    return NextResponse.json({
      ok: true,
      message: sent ? "Check your inbox to finish setting up your account." : emailFailedMessage,
    });
  }

  await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  const sent = await sendVerification();

  return NextResponse.json({
    ok: true,
    message: sent ? "Check your inbox to finish setting up your account." : emailFailedMessage,
  });
}
