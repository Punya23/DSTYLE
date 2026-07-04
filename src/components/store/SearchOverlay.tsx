"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, ArrowUpRight, Mic } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { isVideoUrl } from "@/lib/media";
import { formatPrice, cn } from "@/lib/utils";
import type { Product } from "@/types";

const QUICK = [
  { label: "Bridal", href: "/collections?collection=bridal" },
  { label: "Festive", href: "/collections?collection=festive" },
  { label: "Cocktail", href: "/collections?collection=cocktail" },
  { label: "Pret", href: "/collections?collection=pret" },
  { label: "New Arrivals", href: "/collections?tags=new" },
];

export function SearchOverlay() {
  const { searchOpen, closeSearch } = useUIStore();
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice search — spoken words filter the catalogue live.
  const voice = useSpeechRecognition({
    lang: "en-IN",
    onInterim: (t) => setQ(t),
    onFinal: (t) => setQ(t),
  });

  useEffect(() => {
    if (searchOpen) {
      if (products.length === 0) {
        fetch("/api/products?limit=50")
          .then((r) => r.json())
          .then((d) => setProducts(d.products ?? []))
          .catch(() => {});
      }
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [searchOpen, products.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSearch();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSearch]);

  const s = q.trim().toLowerCase();
  const results =
    s.length === 0
      ? []
      : products.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            (p.collection?.name.toLowerCase().includes(s) ?? false) ||
            p.tags.some((t) => t.toLowerCase().includes(s)) ||
            (p.material ?? "").toLowerCase().includes(s)
        );

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[70] bg-brand-ivory/97 backdrop-blur-2xl overflow-y-auto"
        >
          <div className="shell pt-6 pb-24">
            {/* Search bar */}
            <div className="flex items-center gap-4 border-b border-brand-ink/15 pb-5">
              <Search size={22} strokeWidth={1.5} className="text-brand-gold shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search couture, collections, occasions…"
                className="flex-1 bg-transparent font-display italic text-2xl sm:text-4xl text-brand-ink placeholder:text-brand-ink/25 focus:outline-none"
              />
              {voice.supported && (
                <button
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  className={cn(
                    "shrink-0 grid place-items-center h-10 w-10 rounded-full transition-colors",
                    voice.listening
                      ? "bg-brand-wine text-white animate-pulse"
                      : "text-brand-ink hover:bg-brand-ivory-deep"
                  )}
                  aria-label={voice.listening ? "Stop listening" : "Search by voice"}
                >
                  <Mic size={20} />
                </button>
              )}
              <button
                onClick={closeSearch}
                className="shrink-0 grid place-items-center h-10 w-10 rounded-full hover:bg-brand-ivory-deep transition-colors"
                aria-label="Close search"
              >
                <X size={20} className="text-brand-ink" />
              </button>
            </div>

            {/* Empty state — quick links */}
            {s.length === 0 && (
              <div className="mt-10">
                <p className="eyebrow mb-5">Explore</p>
                <div className="flex flex-wrap gap-3">
                  {QUICK.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={closeSearch}
                      className="px-5 py-2.5 border border-brand-ink/15 rounded-full text-[11px] font-sans tracking-luxe uppercase text-brand-ink hover:border-brand-gold hover:text-brand-gold transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {s.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow mb-6">
                  {results.length} {results.length === 1 ? "result" : "results"}
                </p>
                {results.length === 0 ? (
                  <p className="font-display italic text-2xl text-brand-ink/50">
                    No pieces match &ldquo;{q}&rdquo;.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
                    {results.map((p) => {
                      const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
                      return (
                        <Link
                          key={p.id}
                          href={`/products/${p.slug}`}
                          onClick={closeSearch}
                          className="group block"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden bg-brand-ivory-deep rounded-[4px]">
                            {img && !isVideoUrl(img.url) && (
                              <Image
                                src={img.url}
                                alt={p.name}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="(max-width: 768px) 50vw, 25vw"
                              />
                            )}
                          </div>
                          <div className="mt-3 flex items-start justify-between gap-2">
                            <div>
                              {p.collection && (
                                <p className="text-[9px] font-sans tracking-luxe uppercase text-brand-gold">
                                  {p.collection.name}
                                </p>
                              )}
                              <h3 className="text-[12px] font-sans font-medium text-brand-ink mt-1 leading-snug">
                                {p.name}
                              </h3>
                              <p className="text-[11px] text-[#666] mt-0.5">
                                {formatPrice(Math.min(...p.skus.map((sk) => sk.price)))}
                              </p>
                            </div>
                            <ArrowUpRight
                              size={14}
                              className="text-brand-ink/30 group-hover:text-brand-gold transition-colors shrink-0 mt-1"
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
