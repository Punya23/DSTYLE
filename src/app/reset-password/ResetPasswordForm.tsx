"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/store/auth-modal";
import { PASSWORD_MIN_LENGTH, validatePasswordStrength } from "@/lib/password-rules";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const openAuth = useAuthModal((s) => s.open);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);

    const strengthError = validatePasswordStrength(password);
    if (strengthError) return setError(strengthError);
    if (password !== confirm) return setError("Passwords don't match.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't reset your password. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const heading = (title: string, subtitle: string) => (
    <div className="text-center mb-8">
      <div className="font-display text-2xl tracking-[0.28em] uppercase text-black">Dstyle</div>
      <span className="mx-auto mt-3 mb-4 block h-px w-10 gold-rule-solid opacity-70" />
      <h1 className="font-display italic text-3xl text-black">{title}</h1>
      <p className="mt-2 text-[12px] font-sans text-[#888]">{subtitle}</p>
    </div>
  );

  if (!token) {
    return (
      <div className="border border-brand-ivory-deep bg-white px-8 py-10">
        {heading("Link not valid", "This reset link is missing its token.")}
        <Button
          className="w-full"
          size="lg"
          onClick={() => openAuth()}
        >
          Request A New Link
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="border border-brand-ivory-deep bg-white px-8 py-10 text-center">
        {heading("Password updated", "You can now sign in with your new password.")}
        <div className="mx-auto mb-6 grid place-items-center h-14 w-14 rounded-full bg-brand-gold/10 text-brand-gold">
          <CheckCircle2 size={22} strokeWidth={1.5} />
        </div>
        <Button className="w-full" size="lg" onClick={() => openAuth("/account")}>
          Sign In
        </Button>
        <Link
          href="/collections"
          className="mt-5 block text-[11px] font-sans tracking-luxe uppercase text-[#888] hover:text-black transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-brand-ivory-deep bg-white px-8 py-10">
      {heading("Choose a new password", `At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`)}

      <div className="space-y-5">
        <div className="relative">
          <Input
            label="New Password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            autoComplete="new-password"
            className="pr-11"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 bottom-3 p-1 text-[#a89f92] hover:text-black transition-colors"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Input
          label="Confirm Password"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoComplete="new-password"
        />

        {error && <p className="text-[12px] font-sans text-brand-wine">{error}</p>}

        <Button className="w-full" size="lg" onClick={submit} loading={loading}>
          Update Password
        </Button>
      </div>
    </div>
  );
}
