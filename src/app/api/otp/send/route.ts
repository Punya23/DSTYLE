import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const schema = z.object({ phone: z.string().regex(/^\+?[1-9]\d{9,14}$/) });

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    // Rate limit: max 3 OTP requests per 15 minutes
    const recentAttempts = await prisma.otpToken.count({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    if (recentAttempts >= 3) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait 15 minutes." },
        { status: 429 }
      );
    }

    const otp = generateOtp();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpToken.deleteMany({ where: { phone } });
    await prisma.otpToken.create({ data: { phone, otpHash, expiresAt } });

    // Send via Twilio (only in production)
    if (process.env.NODE_ENV === "production" && process.env.TWILIO_ACCOUNT_SID) {
      const twilio = (await import("twilio")).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      await client.messages.create({
        body: `Your Dstyle verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } else {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      // Dev convenience only — surfaced so the sign-in flow is testable
      // locally without SMS. Never included in production.
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
