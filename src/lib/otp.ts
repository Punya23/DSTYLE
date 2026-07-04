import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Verify a phone OTP against the stored hash and, on success, upsert + return
 * the user. Shared by the standalone `/api/otp/verify` route and the NextAuth
 * Credentials provider so both enforce identical rules (expiry, 5-attempt cap).
 */
export async function verifyOtpAndGetUser(phone: string, otp: string) {
  const record = await prisma.otpToken.findFirst({
    where: { phone, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false as const, error: "OTP expired or not found" };
  }

  if (record.attempts >= 5) {
    await prisma.otpToken.delete({ where: { id: record.id } });
    return { ok: false as const, error: "Too many failed attempts" };
  }

  const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
  if (inputHash !== record.otpHash) {
    await prisma.otpToken.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "Invalid OTP" };
  }

  await prisma.otpToken.delete({ where: { id: record.id } });

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  return { ok: true as const, user };
}
