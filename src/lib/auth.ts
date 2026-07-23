import NextAuth from "next-auth";
import ResendProvider from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { DstyleAuthAdapter } from "@/lib/auth-adapter";
import { getResendClient, FROM_EMAIL } from "@/lib/resend";
import { verifyOtpAndGetUser } from "@/lib/otp";
import type { Role } from "@/generated/prisma/client";

function signInEmailHtml(url: string) {
  return `
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:6px;text-transform:uppercase;">Dstyle</div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b8935e;margin-top:6px;">Indian Couture</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-style:italic;font-weight:300;font-size:24px;text-align:center;">Your sign-in link</h1>
    <p style="text-align:center;color:#666;font-size:14px;line-height:1.6;">
      Click below to sign in to Dstyle. This link expires in 24 hours and can only be used once.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:#17130f;color:#fff;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Sign In</a>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;">
      Didn't request this? You can safely ignore this email.
    </p>
  </div>`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DstyleAuthAdapter(),
  providers: [
    // Email magic-link — the only configured sign-in method for now.
    // Requires a real RESEND_API_KEY; without one, sending throws a clear
    // error rather than silently pretending to succeed.
    ResendProvider({
      apiKey: process.env.RESEND_API_KEY,
      from: FROM_EMAIL,
      async sendVerificationRequest({ identifier: to, url }) {
        const client = getResendClient();
        if (!client) {
          // Local development without a Resend key: print the link to the
          // server console so sign-in still works end-to-end. Never in
          // production — there a missing key is a hard configuration error.
          if (process.env.NODE_ENV !== "production") {
            console.log(
              `\n──────────── Dstyle dev sign-in ────────────\n  ${to}\n  ${url}\n────────────────────────────────────────────\n`
            );
            return;
          }
          throw new Error(
            "Email sign-in isn't configured yet — add a real RESEND_API_KEY."
          );
        }
        // Resend's SDK returns { data, error } rather than throwing on
        // API-level failures (e.g. invalid key, rate limit) — check `error`
        // explicitly, or a failed send would silently report as "sent".
        const { error } = await client.emails.send({
          from: FROM_EMAIL,
          to,
          subject: "Your Dstyle sign-in link",
          html: signInEmailHtml(url),
        });
        if (error) throw new Error(`Resend error: ${error.message}`);
      },
    }),
    // Dormant: re-enable once real Twilio credentials are set. Independent of
    // the adapter above (Credentials providers don't go through it), so it's
    // safe to leave configured — just not currently exposed in the auth UI.
    Credentials({
      id: "phone-otp",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const phone = String(credentials?.phone ?? "").trim();
        const otp = String(credentials?.otp ?? "").trim();
        if (!phone || otp.length !== 6) return null;

        const result = await verifyOtpAndGetUser(phone, otp);
        if (!result.ok) return null;

        return {
          id: result.user.id,
          role: result.user.role,
          name: result.user.name,
          email: result.user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Runs only on initial sign-in (when `user` is present). Both providers
      // return a real row from our own `User` table (the adapter for email,
      // `authorize()`'s own upsert for phone), so `role` is always present —
      // no per-provider special-casing needed.
      if (user) {
        const u = user as { id?: string; role?: Role };
        if (u.id) token.id = u.id;
        if (u.role) token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.role) session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: { strategy: "jwt" },
});
