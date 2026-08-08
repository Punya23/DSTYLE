import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";

/**
 * Marketing list membership.
 *
 * Subscribing is an upsert rather than a create so a repeat signup — which is
 * what a customer who forgot they already joined will do — resurrects the row
 * instead of failing on the unique index. Unsubscribing sets a timestamp rather
 * than deleting, because a deleted row is indistinguishable from one that was
 * never there, and a suppression list is the whole point.
 */

export type SubscribeResult = "subscribed" | "already-subscribed" | "resubscribed";

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function subscribe(email: string, source = "footer"): Promise<SubscribeResult> {
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
    select: { id: true, unsubscribedAt: true },
  });

  if (existing) {
    if (!existing.unsubscribedAt) return "already-subscribed";
    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      // A fresh token on re-subscribe invalidates the link in the old campaign
      // emails, which is what someone who deliberately rejoined would expect.
      data: { unsubscribedAt: null, unsubscribeToken: newToken(), source },
    });
    return "resubscribed";
  }

  await prisma.newsletterSubscriber.create({
    data: { email, source, unsubscribeToken: newToken() },
  });
  return "subscribed";
}

/**
 * Take an address off the list. Returns false only when the token matches
 * nothing — an already-unsubscribed token still reports success, so someone
 * clicking the link twice is not told their unsubscribe failed.
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const row = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, unsubscribedAt: true },
  });
  if (!row) return false;
  if (row.unsubscribedAt) return true;

  await prisma.newsletterSubscriber.update({
    where: { id: row.id },
    data: { unsubscribedAt: new Date() },
  });
  return true;
}

/** The link every marketing email must carry. */
export function unsubscribeUrl(token: string): string {
  return appUrl(`/unsubscribe/${token}`);
}
