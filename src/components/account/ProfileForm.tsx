"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProfileFormProps {
  name: string;
  phone: string;
  email: string;
  emailVerified: boolean;
}

/** Edit display name and contact number. Backed by PUT /api/account/profile. */
export function ProfileForm({ name, phone, email, emailVerified }: ProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [values, setValues] = useState({ name, phone });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);

    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? "Could not save your details.");
      setStatus("idle");
      return;
    }

    setStatus("saved");
    // Refresh the JWT so the header greeting picks up the new name.
    await update({ name: values.name });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5 border border-brand-ivory-deep bg-white p-6">
      <Input
        id="profile-name"
        label="Full name"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        required
        maxLength={100}
      />

      <Input
        id="profile-phone"
        label="Phone"
        type="tel"
        placeholder="+91 98765 43210"
        value={values.phone}
        onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
      />

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-sans font-medium tracking-[0.2em] uppercase text-brand-ink">
          Email
        </span>
        <p className="text-sm font-sans text-[#666666]">
          {email}{" "}
          <span className="text-[11px] text-[#999999]">
            {emailVerified ? "· verified" : "· unverified"}
          </span>
        </p>
        <p className="text-[11px] font-sans text-[#999999]">
          Your email is your sign-in identity and can&apos;t be changed here — contact us to move
          your account to a new address.
        </p>
      </div>

      {error && <p className="text-xs font-sans text-brand-wine">{error}</p>}
      {status === "saved" && !error && (
        <p className="text-xs font-sans text-brand-gold">Saved.</p>
      )}

      <Button type="submit" loading={status === "saving"} size="sm">
        Save changes
      </Button>
    </form>
  );
}
