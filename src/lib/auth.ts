import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyOtpAndGetUser } from "@/lib/otp";
import type { Role } from "@/generated/prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
    async signIn({ user, account }) {
      // Ensure a DB user exists for Google sign-ins (Credentials already upserts).
      if (account?.provider === "google" && user.email) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name, image: user.image },
          create: { email: user.email, name: user.name, image: user.image },
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Runs the DB lookup only on the initial sign-in (when `user` is present).
      if (user) {
        if (account?.provider === "google" && user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } else {
          const u = user as { id?: string; role?: Role };
          if (u.id) token.id = u.id;
          if (u.role) token.role = u.role;
        }
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
