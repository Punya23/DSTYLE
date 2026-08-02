"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Change (or set, for magic-link/Google accounts) the password.
 * Backed by PUT /api/account/password.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setStatus("saving");
    const res = await fetch("/api/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: hasPassword ? current : undefined,
        newPassword: next,
      }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "Could not update your password.");
      setStatus("idle");
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setStatus("saved");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5 border border-brand-ivory-deep bg-white p-6">
      {hasPassword ? (
        <Input
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      ) : (
        <p className="text-[12px] font-sans text-[#888888]">
          You sign in with a magic link. Set a password to also sign in with email and password.
        </p>
      )}

      <Input
        id="new-password"
        label={hasPassword ? "New password" : "Password"}
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
      />

      <Input
        id="confirm-password"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}
      {status === "saved" && !error && (
        <p className="text-xs font-sans text-brand-gold">
          Password {hasPassword ? "updated" : "set"}.
        </p>
      )}

      <Button type="submit" loading={status === "saving"} size="sm" variant="outline">
        {hasPassword ? "Update password" : "Set password"}
      </Button>
    </form>
  );
}
