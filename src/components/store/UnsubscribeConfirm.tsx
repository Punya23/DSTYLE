"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";

/**
 * Confirm-then-unsubscribe. The click is what triggers the POST, so a mail
 * client prefetching the link in the email cannot unsubscribe anybody.
 */
export function UnsubscribeConfirm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setState("working");
    setError(null);
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not complete that. Please try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Network problem — check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div role="status">
        <p className="eyebrow text-brand-gold">Done</p>
        <h1 className="display-2 mt-3 text-brand-ink">You are unsubscribed.</h1>
        <p className="body-copy mt-4 max-w-[52ch]">
          You will not receive any more marketing email from us. Order
          confirmations and delivery updates still come through, because those
          are part of an order you placed.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
          <Link href="/" className="btn-primary">
            Back to the house
          </Link>
          <a
            href={`mailto:${COMPANY.supportEmail}`}
            className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
          >
            Changed your mind? Write to us.
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-brand-gold">Newsletter</p>
      <h1 className="display-2 mt-3 text-brand-ink">Leave the list?</h1>
      <p className="body-copy mt-4 max-w-[52ch]">
        Confirm below and we will stop sending previews, collection drops and
        atelier invitations. Order and delivery emails are unaffected.
      </p>

      {error && (
        <p role="alert" className="mt-6 text-xs font-sans text-brand-wine">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
        <Button type="button" onClick={confirm} loading={state === "working"}>
          Unsubscribe
        </Button>
        <Link
          href="/"
          className="link-reveal font-sans text-[13px] text-brand-ink-soft transition-colors duration-300 hover:text-brand-ink"
        >
          Keep me on the list
        </Link>
      </div>
    </div>
  );
}
