import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { newsletterSchema } from "@/lib/account-schemas";
import { subscribe } from "@/lib/newsletter";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Marketing list signup. Unauthenticated, so rate limited by IP and address. */
export async function POST(req: NextRequest) {
  const ipLimited = await enforceRateLimit(req, "newsletter");
  if (ipLimited) return ipLimited;

  let parsed;
  try {
    parsed = newsletterSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request";
    return NextResponse.json({ error: message ?? "Invalid request" }, { status: 400 });
  }

  // Honeypot — answer 200 so a bot learns nothing from the response.
  if (parsed.company) return NextResponse.json({ ok: true });

  const emailLimited = await enforceRateLimit(req, "newsletter", parsed.email);
  if (emailLimited) return emailLimited;

  try {
    await subscribe(parsed.email, "footer");
    // Deliberately the same response whether the address was new, already on
    // the list, or resurrected: the endpoint is public, and a differing answer
    // would turn it into an oracle for "is this person on the list?".
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter] subscribe failed:", err);
    return NextResponse.json(
      { error: "Could not sign you up just now. Please try again shortly." },
      { status: 500 }
    );
  }
}
