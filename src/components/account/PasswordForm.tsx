"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passwordFormSchemaFor, type PasswordFormInput } from "@/lib/account-schemas";

/**
 * Change (or set, for magic-link/Google accounts) the password.
 * Backed by PUT /api/account/password.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Rebuilding the resolver on every render would reset validation state.
  const schema = useMemo(() => passwordFormSchemaFor(hasPassword), [hasPassword]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormInput>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordFormInput) {
    setFormError(null);
    setSaved(false);

    const res = await fetch("/api/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Accounts without a password have nothing to verify against.
        currentPassword: hasPassword ? values.currentPassword : undefined,
        newPassword: values.newPassword,
      }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFormError(json.error ?? "Could not update your password.");
      return;
    }

    setSaved(true);
    // Never leave a password sitting in a mounted input after a successful save.
    reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-md space-y-5 border border-brand-ivory-deep bg-white p-6"
      noValidate
    >
      {hasPassword ? (
        <Input
          id="current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
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
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <Input
        id="confirm-password"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {formError && <p className="text-xs font-sans text-brand-wine">{formError}</p>}
      {saved && !formError && (
        <p className="text-xs font-sans text-brand-gold">
          Password {hasPassword ? "updated" : "set"}.
        </p>
      )}

      <Button type="submit" loading={isSubmitting} size="sm" variant="outline">
        {hasPassword ? "Update password" : "Set password"}
      </Button>
    </form>
  );
}
