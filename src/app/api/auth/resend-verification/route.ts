import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationEmail, VERIFY_PREFIX } from "@/lib/verification";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Ignore repeat requests inside this window so the inbox can't be flooded. */
const RESEND_COOLDOWN_MS = 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email() });

/**
 * Re-send the verification link for a registration that never confirmed its
 * address. Responds identically for unknown/already-verified addresses.
 */
export async function POST(req: NextRequest) {
  // As with forgot-password: the cooldown is per account, this is per caller.
  const limited = await enforceRateLimit(req, "authWrite");
  if (limited) return limited;

  let email: string;
  try {
    email = bodySchema.parse(await req.json()).email;
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const generic = NextResponse.json({
    ok: true,
    message: "If that account still needs verifying, a new link is on its way.",
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return generic;

  // `VerificationToken` has no createdAt, so the cooldown is derived from the
  // token's expiry instead: a token issued less than a minute ago still has
  // almost its full TTL left.
  const freshCutoff = new Date(Date.now() + VERIFY_TTL_MS - RESEND_COOLDOWN_MS);
  const recent = await prisma.verificationToken.findFirst({
    where: { identifier: `${VERIFY_PREFIX}${email}`, expires: { gt: freshCutoff } },
  });
  if (recent) return generic;

  try {
    await issueVerificationEmail(email);
  } catch (err) {
    console.error("[resend-verification] send failed", err);
  }

  return generic;
}
