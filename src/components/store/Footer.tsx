"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { MagneticButton } from "@/components/ui/aceternity/magnetic-button";
import { GoldParticleField } from "@/components/store/GoldParticleField";

const FOOTER_NAV = {
  Shop: [
    { label: "All Collections", href: "/collections" },
    { label: "Bridal", href: "/collections?collection=bridal" },
    { label: "Festive", href: "/collections?collection=festive" },
    { label: "Cocktail", href: "/collections?collection=cocktail" },
    { label: "Pret", href: "/collections?collection=pret" },
    { label: "New Arrivals", href: "/collections?tags=new" },
    { label: "Style Quiz", href: "/style-quiz" },
  ],
  "Customer Care": [
    { label: "Contact", href: "/about" },
    { label: "Shipping & Delivery", href: "/about" },
    { label: "Returns & Exchanges", href: "/about" },
    { label: "Size Guide", href: "/collections" },
    { label: "FAQs", href: "/about" },
  ],
  House: [
    { label: "About Dstyle", href: "/about" },
    { label: "The Atelier", href: "/about" },
    { label: "Press", href: "/about" },
    { label: "Careers", href: "/about" },
  ],
};

const LEGAL_LINKS = [
  { label: "Privacy", href: "/about" },
  { label: "Terms", href: "/about" },
  { label: "Cookies", href: "/about" },
];

const MARQUEE_TEXT = "Indian Couture · Bridal · Festive · Pret · Handcrafted in Mumbai · ";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sent");
    setEmail("");
  };

  return (
    <footer
      className="relative -mt-7 sm:-mt-10 rounded-t-[28px] sm:rounded-t-[40px] bg-brand-ink text-white z-0 overflow-hidden"
    >
      {/* Marquee */}
      <div className="relative border-b border-white/[0.08] py-4 md:py-5 overflow-hidden w-full">
        <div className="flex animate-marquee whitespace-nowrap">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="text-[10px] font-sans tracking-luxe uppercase text-brand-champagne/30 px-6"
            >
              {MARQUEE_TEXT.repeat(4)}
            </span>
          ))}
        </div>
      </div>

      {/* Newsletter — ambient gold dust drifting behind the copy */}
      <div className="relative border-b border-white/[0.08] overflow-hidden">
        <GoldParticleField className="pointer-events-none absolute inset-0 opacity-70" />
        <div className="shell relative py-14 md:py-16 lg:py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            variants={fadeUp}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end"
          >
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-8 gold-rule-solid opacity-60" />
                <p className="text-[11px] font-sans tracking-luxe uppercase text-brand-gold">
                  Stay in the House
                </p>
              </div>
              <h3 className="font-display italic text-3xl lg:text-[2.5rem] text-white leading-snug text-balance">
                Join the House of Dstyle
              </h3>
              <p className="text-[12px] font-sans text-white/40 mt-4 leading-relaxed max-w-[340px]">
                Private previews, new collection drops, and atelier events — delivered quietly to your inbox.
              </p>
            </div>
            <div className="lg:col-span-7">
              {status === "sent" ? (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] font-sans text-brand-champagne border border-brand-gold/30 bg-brand-gold/[0.06] px-5 py-4"
                >
                  Welcome to the House — check your inbox to confirm.
                </motion.p>
              ) : (
                <form className="flex flex-col sm:flex-row gap-0" onSubmit={handleSubscribe}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="flex-1 bg-white/[0.04] border border-white/12 px-5 py-4 text-sm font-sans text-white placeholder:text-white/25 focus:outline-none focus:border-brand-gold focus:bg-white/[0.06] transition-colors duration-500"
                  />
                  <MagneticButton className="shrink-0 mt-3 sm:mt-0" strength={0.35}>
                    <button
                      type="submit"
                      style={{ backgroundColor: "var(--color-brand-champagne)", color: "var(--color-brand-ink)" }}
                      className="px-8 py-4 w-full text-[10px] font-sans font-semibold tracking-luxe uppercase transition-[filter] duration-300 hover:brightness-105"
                    >
                      Subscribe
                    </button>
                  </MagneticButton>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main navigation grid */}
      <div className="shell py-14 md:py-16 lg:py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12 lg:gap-x-12 lg:gap-y-0 w-full"
        >
          {/* Brand column */}
          <motion.div variants={fadeUp} className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block">
              <span className="font-display text-[1.7rem] tracking-[0.32em] uppercase text-white">
                Dstyle
              </span>
            </Link>
            <p className="mt-5 text-[12px] font-sans text-white/45 leading-[1.8] max-w-[280px]">
              Indian couture for the modern woman. Crafted with intention, worn with grace.
            </p>
            <div className="mt-7 pt-7 border-t border-white/[0.08]">
              <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold/70 mb-3">
                Follow
              </p>
              <MagneticButton strength={0.5}>
                <a
                  href="https://instagram.com/dipti__shahh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-[11px] font-sans tracking-[0.15em] text-white/55 hover:text-brand-champagne transition-colors duration-500 group"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="group-hover:scale-110 transition-transform shrink-0"
                    aria-hidden
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  @dipti__shahh
                </a>
              </MagneticButton>
            </div>
          </motion.div>

          {/* Link columns — equal width across the row */}
          {Object.entries(FOOTER_NAV).map(([section, links]) => (
            <motion.div key={section} variants={fadeUp}>
              <h4 className="text-[10px] font-sans font-medium tracking-luxe uppercase text-brand-gold mb-5 pb-2 border-b border-white/[0.06]">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="link-reveal group inline-flex items-center gap-1.5 text-[12px] font-sans text-white/45 hover:text-white transition-colors duration-500 leading-relaxed"
                    >
                      {link.label}
                      <ArrowUpRight
                        size={11}
                        className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-brand-gold"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.08]">
        <div className="shell py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-sans tracking-[0.2em] uppercase text-white/25 order-2 sm:order-1">
            © {new Date().getFullYear()} Dstyle · All rights reserved
          </p>
          <div className="flex items-center gap-6 order-1 sm:order-2">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="link-reveal inline-block text-[10px] font-sans tracking-[0.18em] uppercase text-white/30 hover:text-white/70 transition-colors duration-500"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-[10px] font-sans tracking-[0.2em] uppercase text-white/20 order-3 hidden sm:block">
            Made in India
          </p>
        </div>
      </div>
    </footer>
  );
}
