import { Resend } from "resend";

let _client: Resend | null = null;

function looksConfigured(key: string | undefined): key is string {
  return Boolean(key) && !/placeholder|your[-_]|xxx|change[-_ ]?me/i.test(key!);
}

/** Shared Resend client — null when RESEND_API_KEY isn't configured (or is still a scaffold placeholder). */
export function getResendClient(): Resend | null {
  if (!looksConfigured(process.env.RESEND_API_KEY)) return null;
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

export const FROM_EMAIL = process.env.FROM_EMAIL || "Dstyle <onboarding@resend.dev>";
