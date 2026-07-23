"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ArrowRight, Send, Mic } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useCartStore } from "@/store/cart";
import { useAuthModal } from "@/store/auth-modal";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { formatPrice, cn } from "@/lib/utils";
import { isVideoUrl } from "@/lib/media";
import type { Product } from "@/types";

type Occasion = {
  key: string;
  chip: string;
  collection: string | null;
  reply: string;
};

const OCCASIONS: Occasion[] = [
  { key: "bridal", chip: "I'm the bride", collection: "bridal", reply: "How wonderful — congratulations! Our bridal atelier hand-embroiders each lehenga over months. A few to begin with:" },
  { key: "festive", chip: "Wedding guest · festive", collection: "festive", reply: "Perfect for the celebrations — these move beautifully through every rasm and ritual:" },
  { key: "cocktail", chip: "A cocktail evening", collection: "cocktail", reply: "Evening glamour, coming right up. These carry an Indian soul into the modern night:" },
  { key: "pret", chip: "Everyday luxury", collection: "pret", reply: "Refined ready-to-wear you can live in — the Pret edit:" },
  { key: "browse", chip: "Just exploring", collection: null, reply: "Take your time — here's a little of everything from the House:" },
];

const COLLECTION_LABEL: Record<string, string> = {
  bridal: "Bridal", festive: "Festive", cocktail: "Cocktail", pret: "Pret",
};

function matchIntent(text: string): Occasion {
  const t = text.toLowerCase();
  if (/(brid|dulhan|my wedding|wedding day|shaadi|lehenga for my)/.test(t)) return OCCASIONS[0];
  if (/(festi|diwali|sangeet|mehndi|guest|puja|celebrat|navratri|karwa)/.test(t)) return OCCASIONS[1];
  if (/(cocktail|party|reception|evening|club|date)/.test(t)) return OCCASIONS[2];
  if (/(everyday|casual|pret|work|daily|simple|kurta|office)/.test(t)) return OCCASIONS[3];
  return OCCASIONS[4];
}

type Msg =
  | { role: "bot"; text: string }
  | { role: "user"; text: string }
  | { role: "picks"; products: Product[]; collection: string | null };

export function StylistConcierge() {
  const { stylistOpen, openStylist, closeStylist, stylistSeed, clearStylistSeed } = useUIStore();
  // The floating trigger sits above the cart drawer / search / auth surfaces in
  // the stacking order, so hide it whenever one of those is open — otherwise the
  // sparkle button and its nudge overlap (and block) their controls, e.g. the
  // cart drawer's "Proceed to Checkout" button.
  const cartOpen = useCartStore((s) => s.isOpen);
  const searchOpen = useUIStore((s) => s.searchOpen);
  const authOpen = useAuthModal((s) => s.isOpen);
  const overlayOpen = cartOpen || searchOpen || authOpen;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [showChips, setShowChips] = useState(true);
  const [nudge, setNudge] = useState(false);
  const [voiceHint, setVoiceHint] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith("/products/") ?? false;

  // Hide the floating trigger while the page's hero (if any) is in view — it
  // competes with the hero's own CTAs. Re-checks on every route change since
  // only the homepage has a [data-site-hero] element.
  useEffect(() => {
    const heroEl = document.querySelector("[data-site-hero]");
    if (!heroEl) {
      setOverHero(false);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setOverHero(entry.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(heroEl);
    return () => io.disconnect();
  }, [pathname]);

  // Fetch catalogue lazily
  useEffect(() => {
    if (stylistOpen && products.length === 0) {
      fetch("/api/products?limit=50").then((r) => r.json()).then((d) => setProducts(d.products ?? [])).catch(() => {});
    }
  }, [stylistOpen, products.length]);

  // First-visit nudge
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("dstyle-stylist-seen")) return;
    const t = setTimeout(() => setNudge(true), 4500);
    return () => clearTimeout(t);
  }, []);

  // Greeting on first open (skipped when opened with a seeded question)
  useEffect(() => {
    if (stylistOpen && messages.length === 0 && !stylistSeed) {
      setMessages([{ role: "bot", text: "Namaste. I'm your Dstyle stylist — tell me what you're dressing for and I'll guide you to the right pieces." }]);
    }
  }, [stylistOpen, messages.length, stylistSeed]);

  const scrollToBottom = (smooth = true) =>
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const dismissNudge = () => {
    setNudge(false);
    localStorage.setItem("dstyle-stylist-seen", "1");
  };

  const handleOpen = () => {
    dismissNudge();
    openStylist();
  };

  const pickProducts = (collection: string | null, slugs: string[] = []) => {
    if (slugs.length) {
      const bySlug = slugs
        .map((s) => products.find((p) => p.slug === s))
        .filter((p): p is Product => Boolean(p));
      if (bySlug.length) return bySlug.slice(0, 3);
    }
    if (collection) return products.filter((p) => p.collection?.slug === collection).slice(0, 3);
    return products.slice(0, 3);
  };

  // Offline keyword flow — the graceful fallback when the AI route is unavailable.
  const fallbackRespond = (userText: string) => {
    const occasion = matchIntent(userText);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { role: "bot", text: occasion.reply },
        { role: "picks", products: pickProducts(occasion.collection), collection: occasion.collection },
      ]);
    }, 250);
  };

  // Ask Claude (the /api/stylist route); fall back to keywords on any error.
  const respond = async (userText: string) => {
    setShowChips(false);
    setInput("");
    const history: Msg[] = [...messages, { role: "user", text: userText }];
    setMessages(history);
    setTyping(true);

    const conv = history
      .filter((m): m is Extract<Msg, { role: "user" | "bot" }> => m.role === "user" || m.role === "bot")
      .map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), text: m.text }));
    while (conv.length && conv[0].role !== "user") conv.shift();

    try {
      const res = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conv }),
      });
      const data = res.ok ? await res.json() : null;
      if (!data || data.error) throw new Error("fallback");
      setTyping(false);
      const picks = pickProducts(data.collection ?? null, data.productSlugs ?? []);
      setMessages((m) => [
        ...m,
        { role: "bot", text: data.reply as string },
        ...(picks.length || data.collection
          ? [{ role: "picks", products: picks, collection: data.collection ?? null } as Msg]
          : []),
      ]);
    } catch {
      fallbackRespond(userText);
    }
  };

  const submitText = () => {
    const t = input.trim();
    if (!t) return;
    respond(t);
  };

  // Voice input (browser Web Speech API — no key, no server). Interim words fill
  // the box live; a final phrase is sent automatically.
  const voice = useSpeechRecognition({
    lang: "en-IN",
    onInterim: (t) => setInput(t),
    onFinal: (t) => {
      setInput("");
      respond(t);
    },
  });

  // Opened from a product page with a seeded question → send it straight away.
  useEffect(() => {
    if (stylistOpen && stylistSeed) {
      const seed = stylistSeed;
      clearStylistSeed();
      respond(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylistOpen, stylistSeed]);

  // One-time "try voice" hint on first open (only where voice is supported).
  useEffect(() => {
    if (!stylistOpen || !voice.supported) return;
    if (typeof window === "undefined" || localStorage.getItem("dstyle-voice-hint")) return;
    const t1 = setTimeout(() => setVoiceHint(true), 900);
    const t2 = setTimeout(() => setVoiceHint(false), 7000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [stylistOpen, voice.supported]);

  const dismissVoiceHint = () => {
    setVoiceHint(false);
    try {
      localStorage.setItem("dstyle-voice-hint", "1");
    } catch {
      /* ignore */
    }
  };

  const restart = () => {
    setMessages([{ role: "bot", text: "Of course — what else can I help you find?" }]);
    setShowChips(true);
  };

  return (
    <>
      {/* Floating trigger + first-visit nudge — hidden while the page's hero is
          in view; sits in the natural bottom-right corner everywhere, and only
          lifts clear of the mobile "Select Size" bar on product pages. */}
      <AnimatePresence>
        {!overHero && !overlayOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "fixed right-4 sm:right-5 z-[64] flex flex-col items-end gap-2.5",
              isProductPage ? "bottom-24 md:bottom-5" : "bottom-5"
            )}
          >
            <AnimatePresence>
              {nudge && !stylistOpen && (
                <motion.button
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  onClick={handleOpen}
                  style={{ backgroundColor: "var(--color-brand-ink)" }}
                  className="max-w-[230px] text-left text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-[0_14px_34px_-14px_rgba(0,0,0,0.6)]"
                >
                  <span className="block text-[10px] tracking-luxe uppercase text-brand-champagne mb-1">
                    Your stylist
                  </span>
                  <span className="block text-[13px] leading-snug font-sans">
                    What are you exploring today? Let me guide you ✨
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {!stylistOpen && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpen}
                aria-label="Open the Dstyle stylist"
                style={{ backgroundColor: "var(--color-brand-champagne)", color: "var(--color-brand-ink)" }}
                className="grid place-items-center h-14 w-14 rounded-full shadow-[0_8px_22px_-6px_rgba(23,19,15,0.5)] border border-brand-ink/10"
              >
                <Sparkles size={22} strokeWidth={1.5} />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Concierge panel */}
      <AnimatePresence>
        {stylistOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeStylist}
              className="fixed inset-0 z-[68] bg-brand-ink/30 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed z-[69] inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px] h-[82vh] sm:h-[600px] max-h-[720px] bg-brand-ivory sm:rounded-2xl rounded-t-3xl overflow-hidden flex flex-col shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-brand-ink text-white shrink-0">
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center h-9 w-9 rounded-full bg-white/10 text-brand-champagne">
                    <Sparkles size={16} strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="font-display text-lg leading-none">The Stylist</p>
                    <p className="text-[10px] tracking-luxe uppercase text-brand-champagne/70 mt-1">Dstyle Atelier</p>
                  </div>
                </div>
                <button onClick={closeStylist} aria-label="Close" className="p-1 text-white/70 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
                {messages.map((m, i) => {
                  if (m.role === "picks") {
                    return (
                      <div key={i} className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {m.products.map((p) => {
                            const img = p.images.find((im) => im.isPrimary) ?? p.images[0];
                            return (
                              <Link key={p.id} href={`/products/${p.slug}`} onClick={closeStylist} className="group block">
                                <div className="relative aspect-[3/4] overflow-hidden bg-brand-ivory-deep rounded-[4px]">
                                  {img && !isVideoUrl(img.url) && (
                                    <Image src={img.url} alt={p.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="120px" />
                                  )}
                                </div>
                                <p className="text-[9px] text-brand-ink mt-1 leading-tight line-clamp-1">{p.name}</p>
                                <p className="text-[9px] text-brand-gold">{formatPrice(Math.min(...p.skus.map((sk) => sk.price)))}</p>
                              </Link>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={m.collection ? `/collections?collection=${m.collection}` : "/collections"}
                            onClick={closeStylist}
                            style={{ backgroundColor: "var(--color-brand-ink)", color: "#ffffff" }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-sans font-semibold tracking-luxe uppercase transition-[filter] hover:brightness-125"
                          >
                            View the {m.collection ? COLLECTION_LABEL[m.collection] : "Full"} Edit
                            <ArrowRight size={13} />
                          </Link>
                          <button onClick={restart} className="px-4 py-2.5 text-[10px] font-sans tracking-luxe uppercase text-brand-ink/60 hover:text-brand-gold transition-colors">
                            Ask again
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className={
                          m.role === "user"
                            ? "max-w-[80%] bg-brand-champagne text-brand-ink rounded-2xl rounded-br-sm px-4 py-2.5 text-[13px] leading-snug"
                            : "max-w-[85%] bg-white text-brand-ink-soft rounded-2xl rounded-bl-sm px-4 py-3 text-[13px] leading-relaxed border border-brand-ivory-deep"
                        }
                      >
                        {m.role === "user" ? (
                          m.text
                        ) : (
                          <TypewriterText text={m.text} onReveal={() => scrollToBottom(false)} />
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {typing && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-brand-ivory-deep rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1.5">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 rounded-full bg-brand-gold/60 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Occasion chips */}
                {showChips && !typing && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {OCCASIONS.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => respond(o.chip)}
                        className="px-3.5 py-2 rounded-full border border-brand-gold/40 text-[11px] font-sans text-brand-ink hover:bg-brand-ink hover:text-white hover:border-brand-ink transition-colors"
                      >
                        {o.chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-brand-ivory-deep bg-white p-3 relative">
                <AnimatePresence>
                  {voiceHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute -top-9 right-14 z-10 flex items-center gap-1.5 rounded-full bg-brand-ink px-3 py-1.5 text-[11px] font-sans text-white shadow-lg"
                    >
                      🎙️ Tap the mic to speak
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitText()}
                    placeholder="Tell me the occasion…"
                    className="flex-1 bg-brand-ivory px-4 py-3 text-[13px] font-sans text-brand-ink placeholder:text-brand-ink/35 focus:outline-none rounded-full"
                  />
                  {voice.supported && (
                    <button
                      onClick={() => {
                        dismissVoiceHint();
                        if (voice.listening) voice.stop();
                        else voice.start();
                      }}
                      aria-label={voice.listening ? "Stop listening" : "Speak to the stylist"}
                      className={cn(
                        "grid place-items-center h-11 w-11 shrink-0 rounded-full transition-colors",
                        voice.listening
                          ? "bg-brand-wine text-white animate-pulse"
                          : "bg-brand-ivory text-brand-ink hover:bg-brand-champagne"
                      )}
                    >
                      <Mic size={16} />
                    </button>
                  )}
                  <button
                    onClick={submitText}
                    aria-label="Send"
                    style={{ backgroundColor: "var(--color-brand-ink)", color: "var(--color-brand-champagne)" }}
                    className="grid place-items-center h-11 w-11 shrink-0 rounded-full transition-[filter] hover:brightness-125"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Reveals the stylist's reply progressively, like a live assistant typing —
 * gives the concierge an LLM feel instead of text snapping in all at once.
 * Runs purely on the client; the underlying message text never changes, so it
 * types once per bot bubble and stays put.
 */
function TypewriterText({ text, onReveal }: { text: string; onReveal?: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    // Reveal ~2 chars per frame → a ~120-char reply finishes in under a second.
    const id = window.setInterval(() => {
      setCount((n) => {
        const next = Math.min(n + 2, text.length);
        if (next >= text.length) window.clearInterval(id);
        return next;
      });
      onReveal?.();
    }, 16);
    return () => window.clearInterval(id);
    // Re-run only when the text itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Zero-width space keeps the bubble height stable before the first character.
  return <>{text.slice(0, count) || "​"}</>;
}
