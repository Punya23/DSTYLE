import NextAuth, { CredentialsSignin } from "next-auth";
import ResendProvider from "next-auth/providers/resend";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { DstyleAuthAdapter } from "@/lib/auth-adapter";
import { prisma } from "@/lib/prisma";
import { getResendClient, FROM_EMAIL } from "@/lib/resend";
import { verifyPassword } from "@/lib/password";
import { verifyOtpAndGetUser } from "@/lib/otp";
import { signInEmailHtml } from "@/lib/auth-emails";
import type { Role } from "@/generated/prisma/client";

/**
 * Signals a registration that exists but hasn't clicked its verification link.
 * NextAuth surfaces `code` to the client as `signIn(...).code`, so the sign-in
 * form can offer to resend the email instead of showing "wrong password".
 */
class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

/** True when Google OAuth credentials are actually present in the environment. */
export const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

const providers: Provider[] = [
  // Email magic-link. Requires a real RESEND_API_KEY; without one, sending
  // throws a clear error rather than silently pretending to succeed.
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
        throw new Error("Email sign-in isn't configured yet — add a real RESEND_API_KEY.");
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

  // Email + password. Registration lives in /api/auth/register; this provider
  // only verifies an existing credential.
  Credentials({
    id: "password",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });

      // No account, or an account that only ever used magic-link/Google. Still
      // run a verification against a throwaway digest so the response time
      // doesn't reveal which emails have passwords set.
      if (!user?.passwordHash) {
        await verifyPassword(password, "scrypt$32768$8$1$00$00");
        return null;
      }

      if (!(await verifyPassword(password, user.passwordHash))) return null;

      // Unverified registrations can't sign in — this is what stops someone
      // from claiming an address they don't control (see the Google linking
      // note in `callbacks.signIn`).
      if (!user.emailVerified) {
        throw new EmailNotVerifiedError();
      }

      return { id: user.id, role: user.role, name: user.name, email: user.email };
    },
  }),

  // Dormant: re-enable once real Twilio credentials are set. Independent of
  // the adapter (Credentials providers don't go through it), so it's safe to
  // leave configured — just not currently exposed in the auth UI.
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
];

// Only register Google when it's actually configured. NextAuth surfaces its
// provider list at /api/auth/providers, so the sign-in UI can hide the Google
// button on deployments where the keys aren't set instead of showing a button
// that errors.
if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Safe here because Google only returns addresses it has verified, and
      // an unverified password registration can never sign in (see the
      // `signIn` callback, which also clears any password an impostor set on
      // an address they didn't own).
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DstyleAuthAdapter(),
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // Pre-hijack defence. Someone can register an address they don't own —
      // they just can't sign in, because registration leaves emailVerified
      // null. If the real owner then arrives via Google, that row gets linked
      // and verified, which would hand the impostor a working password. Drop
      // any password that was set while the address was still unverified.
      if (account?.provider === "google" && user?.email) {
        await prisma.user.updateMany({
          where: { email: user.email, emailVerified: null, passwordHash: { not: null } },
          data: { passwordHash: null },
        });
        // Google only hands back addresses it has verified, so a successful
        // Google sign-in is proof of ownership — record it, otherwise a
        // password set later from account settings could never be used.
        await prisma.user.updateMany({
          where: { email: user.email, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Runs only on initial sign-in (when `user` is present). Every provider
      // returns a real row from our own `User` table (the adapter for email
      // and Google, `authorize()` for credentials), so `role` is always
      // present — no per-provider special-casing needed.
      if (user) {
        const u = user as { id?: string; role?: Role };
        if (u.id) token.id = u.id;
        if (u.role) token.role = u.role;
      }

      // Saving the account profile calls `useSession().update({ name })`; without
      // this the header greeting keeps the stale name until the token expires.
      if (trigger === "update" && session && typeof session === "object") {
        const patch = session as { name?: unknown };
        if (typeof patch.name === "string") token.name = patch.name;
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
