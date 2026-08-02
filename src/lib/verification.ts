import { prisma } from "@/lib/prisma";
import { hashToken, generateResetToken } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/auth-emails";
import { appUrl } from "@/lib/app-url";

/**
 * Verification links live in the same `VerificationToken` table as NextAuth's
 * magic links. The `verify:` prefix on `identifier` keeps the two sets apart,
 * so a verification token can never be replayed as a sign-in token (and vice
 * versa). Only the SHA-256 of the token is stored.
 */
export const VERIFY_PREFIX = "verify:";
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** Issue a fresh email-verification token and send the link. */
export async function issueVerificationEmail(email: string): Promise<void> {
  const raw = generateResetToken();
  await prisma.verificationToken.create({
    data: {
      identifier: `${VERIFY_PREFIX}${email}`,
      token: hashToken(raw),
      expires: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  await sendVerificationEmail(
    email,
    appUrl(`/api/auth/verify-email?token=${raw}&email=${encodeURIComponent(email)}`)
  );
}

/**
 * Consume a verification token and mark the address verified.
 * Returns false for unknown, expired, or already-used tokens.
 */
export async function consumeVerificationToken(email: string, rawToken: string): Promise<boolean> {
  const identifier = `${VERIFY_PREFIX}${email}`;
  const tokenHash = hashToken(rawToken);

  let row;
  try {
    // Delete-and-return so a link can only ever be redeemed once, even if the
    // mail client prefetches it twice concurrently.
    row = await prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token: tokenHash } },
    });
  } catch {
    return false;
  }

  if (row.expires < new Date()) return false;

  await prisma.user.updateMany({
    where: { email, emailVerified: null },
    data: { emailVerified: new Date() },
  });
  return true;
}
