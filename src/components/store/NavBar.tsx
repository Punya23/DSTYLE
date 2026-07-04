"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Search, User, X, Menu, Sparkles, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { useAuthModal } from "@/store/auth-modal";
import { useUIStore } from "@/store/ui";
import { COLLECTION_BANNERS } from "@/data/demo-assets";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  {
    label: "Collections",
    href: "/collections",
    submenu: [
      { label: "Bridal", href: "/collections?collection=bridal" },
      { label: "Festive", href: "/collections?collection=festive" },
      { label: "Cocktail", href: "/collections?collection=cocktail" },
      { label: "Pret", href: "/collections?collection=pret" },
      { label: "View All", href: "/collections" },
    ],
  },
  { label: "New Arrivals", href: "/collections?tags=new" },
  { label: "About", href: "/about" },
];

const MOBILE_COLLECTIONS = [
  { label: "Bridal", slug: "bridal" },
  { label: "Festive", slug: "festive" },
  { label: "Cocktail", slug: "cocktail" },
  { label: "Pret", slug: "pret" },
];

const MOBILE_LINKS = [
  { label: "New Arrivals", href: "/collections?tags=new" },
  { label: "All Collections", href: "/collections" },
  { label: "About the House", href: "/about" },
];

export function NavBar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { totalItems, openCart } = useCartStore();
  const { data: session } = useSession();
  const openAuth = useAuthModal((s) => s.open);
  const openSearch = useUIStore((s) => s.openSearch);
  const openStylist = useUIStore((s) => s.openStylist);
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const overHero = isHome && !scrolled;
  const close = () => setMobileOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleMenuEnter = (label: string) => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    setActiveMenu(label);
  };
  const handleMenuLeave = () => {
    menuTimeoutRef.current = setTimeout(() => setActiveMenu(null), 150);
  };

  const linkClass = cn(
    "link-reveal text-[11px] font-sans font-medium tracking-[0.22em] uppercase transition-colors duration-300",
    overHero ? "text-white/85 hover:text-white" : "text-black hover:text-brand-gold"
  );
  const iconClass = cn(
    "p-1 transition-colors duration-300",
    overHero ? "text-white/85 hover:text-brand-champagne" : "text-black hover:text-brand-gold"
  );

  return (
    <>
      <header
        style={{ viewTransitionName: "site-header" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-40 transition-all duration-500",
          overHero
            ? "bg-transparent"
            : scrolled
              ? "bg-brand-ivory/85 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(23,19,15,0.15)]"
              : "bg-brand-ivory"
        )}
      >
        <div className="shell">
          <div className="flex items-center justify-between h-[64px] sm:h-[76px]">
            <button className={cn("md:hidden p-1 -ml-1", iconClass)} onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={22} strokeWidth={1.5} />
            </button>

            <nav className="hidden md:flex items-center gap-6 lg:gap-10">
              {NAV_LINKS.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => link.submenu && handleMenuEnter(link.label)}
                  onMouseLeave={handleMenuLeave}
                >
                  <Link href={link.href} className={linkClass} transitionTypes={["nav-forward"]}>
                    {link.label}
                  </Link>
                  {link.submenu && (
                    <AnimatePresence>
                      {activeMenu === link.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }}
                          onMouseEnter={() => handleMenuEnter(link.label)}
                          onMouseLeave={handleMenuLeave}
                          className="absolute top-full left-0 pt-3 min-w-[190px]"
                        >
                          <div className="bg-brand-ivory border border-brand-ivory-deep py-3 shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
                            {link.submenu.map((item) => (
                              <Link
                                key={item.label}
                                href={item.href}
                                onClick={() => setActiveMenu(null)}
                                className="block px-5 py-2.5 text-[11px] font-sans tracking-[0.2em] uppercase text-black/80 hover:text-brand-gold hover:bg-white transition-colors"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </nav>

            <Link
              href="/"
              transitionTypes={["nav-back"]}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 font-display uppercase transition-colors duration-300",
                "text-[1.2rem] sm:text-[1.4rem] tracking-[0.3em] sm:tracking-[0.38em]",
                overHero ? "text-white" : "text-black"
              )}
            >
              Dstyle
            </Link>

            <div className="flex items-center gap-4 sm:gap-5">
              <button className={iconClass} onClick={openSearch} aria-label="Search">
                <Search size={18} strokeWidth={1.5} />
              </button>
              {session?.user ? (
                <Link href="/account" className={cn("hidden md:block", iconClass)} aria-label="Account">
                  <User size={18} strokeWidth={1.5} />
                </Link>
              ) : (
                <button onClick={() => openAuth()} className={cn("hidden md:block", iconClass)} aria-label="Sign in">
                  <User size={18} strokeWidth={1.5} />
                </button>
              )}
              <button className={cn("relative", iconClass)} onClick={openCart} aria-label="Cart">
                <ShoppingBag size={18} strokeWidth={1.5} />
                {totalItems() > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1.5 h-4 w-4 text-[9px] flex items-center justify-center rounded-full font-sans font-semibold",
                      overHero ? "bg-brand-champagne text-brand-ink" : "bg-brand-gold text-white"
                    )}
                  >
                    {totalItems()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu — full-screen editorial */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[55] bg-brand-ivory flex flex-col overflow-y-auto md:hidden"
          >
            <div className="flex items-center justify-between shell h-[64px] shrink-0 sticky top-0 bg-brand-ivory z-10">
              <span className="font-display text-xl tracking-[0.28em] uppercase">Dstyle</span>
              <button onClick={close} className="p-1 -mr-1" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <div className="shell pb-12 flex-1">
              {/* Stylist CTA */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                onClick={() => {
                  close();
                  openStylist();
                }}
                style={{ backgroundColor: "var(--color-brand-champagne)" }}
                className="w-full flex items-center gap-4 text-brand-ink px-5 py-4 mt-1 ring-1 ring-brand-gold-deep/25 shadow-sm"
              >
                <Sparkles size={20} className="text-brand-ink shrink-0" />
                <span className="text-left flex-1">
                  <span className="block text-[14px] font-sans font-medium">Ask the Stylist</span>
                  <span className="block text-[10px] tracking-luxe uppercase text-brand-ink/60 mt-0.5">
                    Tell us what you&rsquo;re dressing for
                  </span>
                </span>
                <ChevronRight size={16} className="text-brand-ink/40" />
              </motion.button>

              {/* Search */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => {
                  close();
                  openSearch();
                }}
                className="w-full flex items-center gap-3 border border-brand-ivory-deep px-5 py-3.5 mt-3 text-brand-ink/45"
              >
                <Search size={17} />
                <span className="text-[13px] font-sans">Search couture&hellip;</span>
              </motion.button>

              {/* Collections grid */}
              <p className="eyebrow mt-9 mb-4">Collections</p>
              <div className="grid grid-cols-2 gap-3">
                {MOBILE_COLLECTIONS.map((c, i) => (
                  <motion.div
                    key={c.slug}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.05 }}
                  >
                    <Link
                      href={`/collections?collection=${c.slug}`}
                      onClick={close}
                      className="group block relative aspect-[4/5] overflow-hidden bg-brand-ivory-deep rounded-[3px]"
                    >
                      {COLLECTION_BANNERS[c.slug] && (
                        <Image
                          src={COLLECTION_BANNERS[c.slug]}
                          alt={c.label}
                          fill
                          className="object-cover object-top transition-transform duration-700 group-active:scale-110"
                          sizes="45vw"
                        />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-brand-ink/75 via-brand-ink/10 to-transparent" />
                      <span className="absolute bottom-3 left-4 font-display text-xl text-white">{c.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Links */}
              <div className="mt-9 flex flex-col border-t border-brand-ivory-deep">
                {MOBILE_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={close}
                    className="flex items-center justify-between py-4 text-[12px] font-sans tracking-luxe uppercase text-brand-ink border-b border-brand-ivory-deep active:text-brand-gold transition-colors"
                  >
                    {link.label}
                    <ChevronRight size={15} className="text-brand-gold" />
                  </Link>
                ))}
                {session?.user ? (
                  <Link
                    href="/account"
                    onClick={close}
                    className="flex items-center justify-between py-4 text-[12px] font-sans tracking-luxe uppercase text-brand-ink border-b border-brand-ivory-deep"
                  >
                    My Account
                    <ChevronRight size={15} className="text-brand-gold" />
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      close();
                      openAuth();
                    }}
                    className="flex items-center justify-between py-4 text-[12px] font-sans tracking-luxe uppercase text-brand-ink border-b border-brand-ivory-deep"
                  >
                    Sign In
                    <ChevronRight size={15} className="text-brand-gold" />
                  </button>
                )}
                {isStaff && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="flex items-center justify-between py-4 text-[12px] font-sans tracking-luxe uppercase text-brand-gold border-b border-brand-ivory-deep"
                  >
                    Admin Dashboard
                    <ChevronRight size={15} />
                  </Link>
                )}
              </div>

              <a
                href="https://instagram.com/dipti__shahh"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="mt-8 inline-block text-[11px] font-sans tracking-luxe uppercase text-brand-gold"
              >
                @dipti__shahh
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
