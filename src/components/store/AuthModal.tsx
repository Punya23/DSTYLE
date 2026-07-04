"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { X, ArrowLeft } from "lucide-react";
import { useAuthModal } from "@/store/auth-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuthModal() {
  const { isOpen, callbackUrl, open, close } = useAuthModal();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-open when the proxy auth guard redirects here (?authRequired=1)
  useEffect(() => {
    if (searchParams.get("authRequired") === "1") {
      open(searchParams.get("callbackUrl") ?? undefined);
    }
  }, [searchParams, open]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const reset = () => {
    setStep("phone");
    setOtp("");
    setDevOtp(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    close();
    setTimeout(reset, 300);
  };

  const sendOtp = async () => {
    if (!/^\+?[1-9]\d{9,14}$/.test(phone.trim())) {
      setError("Enter a valid phone number (with country code).");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send code. Try again.");
        return;
      }
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("phone-otp", {
        phone: phone.trim(),
        otp: otp.trim(),
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid or expired code. Please try again.");
        return;
      }
      handleClose();
      if (callbackUrl) router.push(callbackUrl);
      else router.refresh();
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = () => {
    signIn("google", { callbackUrl: callbackUrl ?? "/account" });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-brand-ink/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative w-full max-w-[420px] bg-brand-ivory shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1 text-black/50 hover:text-black transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <div className="px-8 sm:px-10 py-10">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="font-display text-2xl tracking-[0.28em] uppercase text-black">
                    Dstyle
                  </div>
                  <span className="mx-auto mt-3 mb-4 block h-px w-10 gold-rule-solid opacity-70" />
                  <h2 className="font-display italic text-3xl text-black">
                    {step === "phone" ? "Welcome" : "Verify"}
                  </h2>
                  <p className="mt-2 text-[12px] font-sans text-[#888]">
                    {step === "phone"
                      ? "Sign in to shop, track orders & save favourites."
                      : `Enter the 6-digit code sent to ${phone}.`}
                  </p>
                </div>

                {step === "phone" ? (
                  <div className="space-y-5">
                    <button
                      onClick={googleSignIn}
                      className="w-full flex items-center justify-center gap-3 h-12 border border-brand-ivory-deep bg-white text-[12px] font-sans font-medium tracking-wide text-black hover:border-brand-gold transition-colors"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    <div className="flex items-center gap-4">
                      <span className="flex-1 h-px bg-brand-ivory-deep" />
                      <span className="text-[10px] font-sans tracking-luxe uppercase text-[#aaa]">or</span>
                      <span className="flex-1 h-px bg-brand-ivory-deep" />
                    </div>

                    <Input
                      label="Phone Number"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      placeholder="+91 98765 43210"
                      autoFocus
                    />

                    {error && <p className="text-[12px] text-brand-wine">{error}</p>}

                    <Button className="w-full" size="lg" onClick={sendOtp} loading={loading}>
                      Send Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {devOtp && (
                      <p className="text-[11px] font-sans text-center text-brand-gold bg-brand-gold/10 border border-brand-gold/30 py-2">
                        Dev code: <span className="font-semibold tracking-widest">{devOtp}</span>
                      </p>
                    )}

                    <Input
                      label="Verification Code"
                      value={otp}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                      placeholder="••••••"
                      inputMode="numeric"
                      autoFocus
                    />

                    {error && <p className="text-[12px] text-brand-wine">{error}</p>}

                    <Button className="w-full" size="lg" onClick={verifyOtp} loading={loading}>
                      Verify & Sign In
                    </Button>

                    <button
                      onClick={() => {
                        setStep("phone");
                        setError(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 text-[11px] font-sans tracking-wide text-[#888] hover:text-black transition-colors"
                    >
                      <ArrowLeft size={13} /> Use a different number
                    </button>
                  </div>
                )}

                <p className="mt-7 text-center text-[10px] font-sans text-[#aaa] leading-relaxed">
                  By continuing you agree to our Terms &amp; Privacy Policy.
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
