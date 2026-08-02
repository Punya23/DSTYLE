"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signIn, getProviders } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuthModal } from "@/store/auth-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-rules";

type Mode = "signin" | "register" | "forgot";
/** Terminal screens that replace the form once an email has gone out. */
type Sent = "magic" | "verify" | "reset" | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY: Record<Mode, { title: string; subtitle: string }> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to shop, track orders & save favourites.",
  },
  register: {
    title: "Create account",
    subtitle: "One account for orders, wishlist and saved addresses.",
  },
  forgot: {
    title: "Forgot password",
    subtitle: "We'll email you a link to choose a new one.",
  },
};

const SENT_COPY: Record<NonNullable<Sent>, { title: string; body: string }> = {
  magic: {
    title: "Check your email",
    body: "Click the link in that email to finish signing in. It expires in 24 hours.",
  },
  verify: {
    title: "Verify your email",
    body: "We've sent a verification link. Click it to activate your account, then sign in with your password.",
  },
  reset: {
    title: "Check your email",
    body: "If that email has an account, a password-reset link is on its way. It expires in 1 hour.",
  },
};

export function AuthModal() {
  const { isOpen, callbackUrl, open, close } = useAuthModal();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Flags the verification redirect leaves in the URL. Read during render
  // rather than copied into state — they're inputs to what the modal shows,
  // and `handleClose` clears them from the URL when the user dismisses it.
  const verifiedFlag = searchParams.get("verified") === "1";
  const verifyErrorFlag = searchParams.get("verifyError") === "1";

  const [mode, setMode] = useState<Mode>("signin");
  const [sent, setSent] = useState<Sent>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<null | "password" | "google" | "magic" | "submit">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const destination = callbackUrl ?? "/account";

  // Anything the user's own actions produce wins over the URL flag, so the
  // "email verified" banner disappears the moment they submit something.
  const shownNotice = notice ?? (verifiedFlag ? "Email verified — you can sign in now." : null);
  const shownError =
    error ??
    (verifyErrorFlag
      ? "That verification link is invalid or has expired. Sign in to get a new one."
      : null);

  // Google is only registered as a provider when its keys are configured, so
  // asking NextAuth what it has beats a separate NEXT_PUBLIC_ flag that could
  // drift out of sync with reality.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getProviders()
      .then((p) => !cancelled && setGoogleEnabled(Boolean(p && "google" in p)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Entry points that land on the store with a query flag: the proxy's auth
  // guard (?authRequired=1) and the email-verification redirect. Only opens
  // the modal — what it then displays is derived from the flags above.
  useEffect(() => {
    if (searchParams.get("authRequired") === "1") {
      open(searchParams.get("callbackUrl") ?? undefined);
    } else if (verifiedFlag || verifyErrorFlag) {
      open();
    }
  }, [searchParams, verifiedFlag, verifyErrorFlag, open]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const reset = useCallback(() => {
    setMode("signin");
    setSent(null);
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
    setPassword("");
    setLoading(null);
  }, []);

  const handleClose = () => {
    close();
    // Clear the one-shot query flags so re-mounting doesn't re-open the modal.
    if (searchParams.has("authRequired") || searchParams.has("verified") || searchParams.has("verifyError")) {
      router.replace(window.location.pathname);
    }
    setTimeout(reset, 300);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
  };

  const validEmail = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    return true;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const signInWithPassword = async () => {
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
    if (!validEmail()) return;
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading("password");
    try {
      const res = await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.code === "email_not_verified") {
        setUnverifiedEmail(email.trim().toLowerCase());
        setError("This account hasn't been verified yet.");
        return;
      }
      if (res?.error) {
        setError("Incorrect email or password.");
        return;
      }
      window.location.assign(destination);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const register = async () => {
    setError(null);
    setNotice(null);
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!validEmail()) return;
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    setLoading("submit");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't create your account. Please try again.");
        return;
      }
      setSent("verify");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const sendMagicLink = async () => {
    setError(null);
    setNotice(null);
    if (!validEmail()) return;

    setLoading("magic");
    try {
      const res = await signIn("resend", {
        email: email.trim().toLowerCase(),
        redirect: false,
        callbackUrl: destination,
      });
      if (res?.error) {
        setError("Couldn't send the sign-in link. Please try again.");
        return;
      }
      setSent("magic");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const sendReset = async () => {
    setError(null);
    setNotice(null);
    if (!validEmail()) return;

    setLoading("submit");
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSent("reset");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const resendVerification = async () => {
    if (!unverifiedEmail) return;
    setLoading("submit");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      setSent("verify");
      setError(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const signInWithGoogle = () => {
    setLoading("google");
    void signIn("google", { callbackUrl: destination });
  };

  const submit = () => {
    if (mode === "signin") return signInWithPassword();
    if (mode === "register") return register();
    return sendReset();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const busy = loading !== null;

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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 pointer-events-none overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative my-auto w-full max-w-[420px] bg-brand-ivory shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1 text-black/50 hover:text-black transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              {sent && mode === "forgot" && (
                <button
                  onClick={() => {
                    setSent(null);
                    switchMode("signin");
                  }}
                  className="absolute top-4 left-4 p-1 text-black/50 hover:text-black transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} />
                </button>
              )}

              <div className="px-8 sm:px-10 py-10">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="font-display text-2xl tracking-[0.28em] uppercase text-black">
                    Dstyle
                  </div>
                  <span className="mx-auto mt-3 mb-4 block h-px w-10 gold-rule-solid opacity-70" />
                  <h2 className="font-display italic text-3xl text-black">
                    {sent ? SENT_COPY[sent].title : COPY[mode].title}
                  </h2>
                  <p className="mt-2 text-[12px] font-sans text-[#888]">
                    {sent ? `We've sent it to ${email.trim() || unverifiedEmail}.` : COPY[mode].subtitle}
                  </p>
                </div>

                {sent ? (
                  <div className="space-y-5 text-center">
                    <div className="mx-auto grid place-items-center h-14 w-14 rounded-full bg-brand-gold/10 text-brand-gold">
                      <Mail size={22} strokeWidth={1.5} />
                    </div>
                    <p className="text-[12px] font-sans text-[#888] leading-relaxed">
                      {SENT_COPY[sent].body}
                    </p>
                    <button
                      onClick={() => {
                        setSent(null);
                        setPassword("");
                      }}
                      className="w-full text-[11px] font-sans tracking-wide text-[#888] hover:text-black transition-colors"
                    >
                      Use a different email
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {googleEnabled && mode !== "forgot" && (
                      <>
                        <button
                          type="button"
                          onClick={signInWithGoogle}
                          disabled={busy}
                          style={{ backgroundColor: "#ffffff", color: "#17130f", border: "1px solid #e5ded3" }}
                          className="w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 font-sans text-xs tracking-[0.18em] uppercase transition-colors hover:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <GoogleMark />
                          {loading === "google" ? "Redirecting..." : "Continue with Google"}
                        </button>
                        <Divider label="or" />
                      </>
                    )}

                    {mode === "register" && (
                      <Input
                        label="Full Name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setError(null);
                        }}
                        placeholder="Your name"
                        autoComplete="name"
                      />
                    )}

                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && submit()}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus={mode !== "register"}
                    />

                    {mode !== "forgot" && (
                      <div className="relative">
                        <Input
                          label="Password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError(null);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && submit()}
                          placeholder={
                            mode === "register" ? `At least ${PASSWORD_MIN_LENGTH} characters` : "••••••••"
                          }
                          autoComplete={mode === "register" ? "new-password" : "current-password"}
                          className="pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 bottom-3 p-1 text-[#a89f92] hover:text-black transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    )}

                    {mode === "signin" && (
                      <div className="flex justify-end -mt-2">
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="text-[11px] font-sans text-[#888] hover:text-brand-gold transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {shownNotice && (
                      <p className="text-[12px] font-sans text-brand-gold">{shownNotice}</p>
                    )}

                    {shownError && (
                      <div className="space-y-2">
                        <p className="text-[12px] font-sans text-brand-wine">{shownError}</p>
                        {unverifiedEmail && (
                          <button
                            type="button"
                            onClick={resendVerification}
                            className="text-[11px] font-sans underline underline-offset-4 text-black hover:text-brand-gold transition-colors"
                          >
                            Re-send the verification email
                          </button>
                        )}
                      </div>
                    )}

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={submit}
                      loading={loading === "password" || loading === "submit"}
                      disabled={busy}
                    >
                      {mode === "signin" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link"}
                    </Button>

                    {mode !== "forgot" && (
                      <>
                        <Divider label="or" />
                        <Button
                          variant="outline"
                          className="w-full"
                          size="lg"
                          onClick={sendMagicLink}
                          loading={loading === "magic"}
                          disabled={busy}
                        >
                          Email Me A Sign-In Link
                        </Button>
                      </>
                    )}

                    <p className="pt-1 text-center text-[11px] font-sans text-[#888]">
                      {mode === "register" ? (
                        <>
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={() => switchMode("signin")}
                            className="text-black hover:text-brand-gold underline underline-offset-4 transition-colors"
                          >
                            Sign in
                          </button>
                        </>
                      ) : mode === "signin" ? (
                        <>
                          New to Dstyle?{" "}
                          <button
                            type="button"
                            onClick={() => switchMode("register")}
                            className="text-black hover:text-brand-gold underline underline-offset-4 transition-colors"
                          >
                            Create an account
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => switchMode("signin")}
                          className="text-black hover:text-brand-gold underline underline-offset-4 transition-colors"
                        >
                          Back to sign in
                        </button>
                      )}
                    </p>
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

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-brand-ivory-deep" />
      <span className="text-[10px] font-sans tracking-[0.2em] uppercase text-[#aaa]">{label}</span>
      <span className="h-px flex-1 bg-brand-ivory-deep" />
    </div>
  );
}

/** Google's mark, inlined so the button needs no external asset. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
