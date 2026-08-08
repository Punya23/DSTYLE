import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeVerificationToken } from "@/lib/verification";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Both values come straight off the query string of a link anyone can craft, so
 * they are validated before reaching the token lookup rather than after.
 */
const querySchema = z.object({
  token: z.string().min(16).max(256),
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Redeem an email-verification link. Always redirects back to the store — the
 * query flag tells the sign-in modal what to show. Never renders its own page,
 * so a prefetched or double-clicked link can't leave the user on a dead end.
 */
export async function GET(req: NextRequest) {
  const url = new URL("/", req.nextUrl.origin);

  // This is a link click, not an XHR — a JSON 429 would land the customer on a
  // raw error body. Over budget is folded into the same failure redirect.
  const { success } = await checkRateLimit(req, "authWrite");
  if (!success) {
    url.searchParams.set("verifyError", "1");
    return NextResponse.redirect(url);
  }

  const parsed = querySchema.safeParse({
    token: req.nextUrl.searchParams.get("token") ?? "",
    email: req.nextUrl.searchParams.get("email") ?? "",
  });

  // A malformed link is indistinguishable from an expired one, on purpose —
  // neither should tell the caller which part was wrong.
  if (!parsed.success) {
    url.searchParams.set("verifyError", "1");
    return NextResponse.redirect(url);
  }

  const { token, email } = parsed.data;

  if (await consumeVerificationToken(email, token)) {
    url.searchParams.set("verified", "1");
    url.searchParams.set("email", email);
  } else {
    url.searchParams.set("verifyError", "1");
  }
  return NextResponse.redirect(url);
}
