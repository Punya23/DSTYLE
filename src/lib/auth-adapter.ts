import type { Adapter, AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

/**
 * Minimal NextAuth adapter — implements only what this app's flow actually
 * calls: the Email (magic-link) provider and Google OAuth, both under a JWT
 * session strategy.
 *
 * That means no Session table: sign-in with a JWT strategy never calls
 * createSession/getSessionAndUser/deleteSession. Backed directly by the
 * existing `User` table plus small `VerificationToken` and `Account` tables —
 * no generic `@auth/prisma-adapter` dependency, and no unused tables sitting
 * empty.
 *
 * `User.email` is nullable in the Prisma schema (phone-only accounts can
 * exist), but every user this adapter touches signed in by email or Google, so
 * it's always present in practice — the `!` cast below reflects that
 * invariant, not a runtime guarantee from the schema itself.
 */
function toAdapterUser(user: User): AdapterUser {
  // Strip the password digest before the row travels into NextAuth's callback
  // chain (and from there into the JWT). Nothing downstream needs it.
  const safe: Partial<User> = { ...user };
  delete safe.passwordHash;
  return { ...safe, email: user.email! } as AdapterUser;
}

export function DstyleAuthAdapter(): Adapter {
  return {
    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? toAdapterUser(user) : null;
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
      return toAdapterUser(user);
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
      return toAdapterUser(user);
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

    // ── OAuth (Google) ───────────────────────────────────────────────────────

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return account ? toAdapterUser(account.user) : null;
    },

    async linkAccount(account) {
      await prisma.account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? null,
          access_token: account.access_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state:
            typeof account.session_state === "string" ? account.session_state : null,
        },
      });
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await prisma.account.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
    },
  };
}
