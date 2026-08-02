import { NextRequest, NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/verification";

/**
 * Redeem an email-verification link. Always redirects back to the store — the
 * query flag tells the sign-in modal what to show. Never renders its own page,
 * so a prefetched or double-clicked link can't leave the user on a dead end.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();

  const ok = token && email && (await consumeVerificationToken(email, token));

  const url = new URL("/", req.nextUrl.origin);
  if (ok) {
    url.searchParams.set("verified", "1");
    url.searchParams.set("email", email);
  } else {
    url.searchParams.set("verifyError", "1");
  }
  return NextResponse.redirect(url);
}
