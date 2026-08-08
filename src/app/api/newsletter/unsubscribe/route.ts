import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unsubscribeByToken } from "@/lib/newsletter";
import { enforceRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ token: z.string().trim().min(16).max(128) });

/**
 * One-click unsubscribe.
 *
 * POST rather than GET on purpose: mail clients and link scanners prefetch
 * every URL in an email, and a GET here would unsubscribe people who never
 * clicked anything.
 */
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "write");
  if (limited) return limited;

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "That link is not valid." }, { status: 400 });
  }

  try {
    const ok = await unsubscribeByToken(parsed.token);
    if (!ok) {
      return NextResponse.json(
        { error: "That link has expired. Write to us and we'll remove you by hand." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter] unsubscribe failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
