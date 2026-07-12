import type { Adapter, AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";

/**
 * Minimal NextAuth adapter — implements only what this app's flow actually
 * calls: the Email (magic-link) provider under a JWT session strategy.
 *
 * That means no Account/Session tables: sign-in with a JWT strategy never
 * calls createSession/getSessionAndUser/deleteSession, and this app has no
 * OAuth provider wired to the adapter (so getUserByAccount/linkAccount are
 * never invoked either). Backed directly by the existing `User` table plus
 * a small `VerificationToken` table — no generic `@auth/prisma-adapter`
 * dependency, and no unused tables sitting empty.
 *
 * `User.email` is nullable in the Prisma schema (phone-only accounts can
 * exist), but every user this adapter touches signed in by email, so it's
 * always present in practice — the `!` casts below reflect that invariant,
 * not a runtime guarantee from the schema itself.
 */
export function DstyleAuthAdapter(): Adapter {
  return {
    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return { ...user, email: user.email! } as AdapterUser;
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return { ...user, email: user.email! } as AdapterUser;
    },

    async createUser(data) {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          image: data.image,
          emailVerified: data.emailVerified,
        },
      });
      return { ...user, email: user.email! } as AdapterUser;
    },

    async updateUser(data) {
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.image !== undefined ? { image: data.image } : {}),
          ...(data.emailVerified !== undefined ? { emailVerified: data.emailVerified } : {}),
        },
      });
      return { ...user, email: user.email! } as AdapterUser;
    },

    async createVerificationToken(data) {
      return prisma.verificationToken.create({ data });
    },

    async useVerificationToken({ identifier, token }) {
      try {
        // Delete-and-return in one step so a token can only ever be used once.
        return await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
      } catch {
        // Already used, or never existed — either way, not a valid sign-in.
        return null;
      }
    },
  };
}
