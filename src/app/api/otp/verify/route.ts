import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtpAndGetUser } from "@/lib/otp";

const schema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = schema.parse(await req.json());

    const result = await verifyOtpAndGetUser(phone, otp);
    if (!result.ok) {
      const status = result.error === "Too many failed attempts" ? 429 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true, userId: result.user.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
