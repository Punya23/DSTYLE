import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { contactSchema } from "@/lib/account-schemas";
import { sendContactEmails } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { COMPANY } from "@/lib/company";

/**
 * Contact-form intake.
 *
 * Unauthenticated and sends mail, so it is rate limited by IP and again by the
 * submitted address — the second scope stops one sender flooding us from a
 * rotating IP, the first stops one host flooding us with rotating addresses.
 */
export async function POST(req: NextRequest) {
  const ipLimited = await enforceRateLimit(req, "contact");
  if (ipLimited) return ipLimited;

  let parsed;
  try {
    parsed = contactSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  // Honeypot: a filled hidden field means a bot. Answer 200 so the sender
  // learns nothing about why nothing happened.
  if (parsed.company) return NextResponse.json({ ok: true });

  const emailLimited = await enforceRateLimit(req, "contact", parsed.email);
  if (emailLimited) return emailLimited;

  const delivered = await sendContactEmails({
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone || undefined,
    topic: parsed.topic,
    orderRef: parsed.orderRef || undefined,
    message: parsed.message,
  });

  if (!delivered) {
    return NextResponse.json(
      {
        error: `We couldn't send that just now. Please email ${COMPANY.supportEmail} directly and we'll pick it up.`,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
