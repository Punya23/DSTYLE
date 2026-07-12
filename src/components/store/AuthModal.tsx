"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { X, Mail } from "lucide-react";
import { useAuthModal } from "@/store/auth-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuthModal() {
  const { isOpen, callbackUrl, open, close } = useAuthModal();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
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
    setStep("email");
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    close();
    setTimeout(reset, 300);
  };

  const sendMagicLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("resend", {
        email: email.trim(),
        redirect: false,
        callbackUrl: callbackUrl ?? "/account",
      });
      if (res?.error) {
        setError("Couldn't send the sign-in link. Please try again.");
        return;
      }
      setStep("sent");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
                    {step === "email" ? "Welcome" : "Check your email"}
                  </h2>
                  <p className="mt-2 text-[12px] font-sans text-[#888]">
                    {step === "email"
                      ? "Sign in to shop, track orders & save favourites."
                      : `We've sent a sign-in link to ${email}.`}
                  </p>
                </div>

                {step === "email" ? (
                  <div className="space-y-5">
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                      placeholder="you@example.com"
                      autoFocus
                    />

                    {error && <p className="text-[12px] text-brand-wine">{error}</p>}

                    <Button className="w-full" size="lg" onClick={sendMagicLink} loading={loading}>
                      Send Sign-In Link
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5 text-center">
                    <div className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-brand-gold/10 text-brand-gold">
                      <Mail size={22} strokeWidth={1.5} />
                    </div>
                    <p className="text-[12px] font-sans text-[#888] leading-relaxed">
                      Click the link in that email to finish signing in. It expires in 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setStep("email");
                        setError(null);
                      }}
                      className="w-full text-[11px] font-sans tracking-wide text-[#888] hover:text-black transition-colors"
                    >
                      Use a different email
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
