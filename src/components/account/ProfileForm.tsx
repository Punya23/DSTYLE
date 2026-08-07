"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSchema, type ProfileInput } from "@/lib/account-schemas";

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
  // Server-side failures that aren't tied to one field — e.g. the phone number
  // already belonging to another account.
  const [formError, setFormError] = useState<string | null>(null);
  // Tracked here rather than read from `isSubmitSuccessful`, which only reports
  // that the handler returned — it knows nothing about the response status.
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone },
  });

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    setSaved(false);

    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFormError(json.error ?? "Could not save your details.");
      return;
    }

    setSaved(true);
    // Re-seed the form with what was saved so the fields are no longer dirty.
    reset(values);
    // Refresh the JWT so the header greeting picks up the new name.
    await update({ name: values.name });
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-md space-y-5 border border-brand-ivory-deep bg-white p-6"
      noValidate
    >
      <Input
        id="profile-name"
        label="Full name"
        maxLength={100}
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        id="profile-phone"
        label="Phone"
        type="tel"
        placeholder="+91 98765 43210"
        error={errors.phone?.message}
        {...register("phone")}
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

      {formError && <p className="text-xs font-sans text-brand-wine">{formError}</p>}
      {saved && !formError && <p className="text-xs font-sans text-brand-gold">Saved.</p>}

      <Button type="submit" loading={isSubmitting} size="sm">
        Save changes
      </Button>
    </form>
  );
}
