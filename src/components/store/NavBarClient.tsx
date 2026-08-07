"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Heart, Menu, Search, ShoppingBag, Sparkles, User, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { useAuthModal } from "@/store/auth-modal";
import { useUIStore } from "@/store/ui";
import { MagneticButton } from "@/components/ui/aceternity/magnetic-button";
import { cn } from "@/lib/utils";

/** One entry of the real collection taxonomy, resolved server-side by `NavBar`. */
export interface NavCollection {
  name: string;
  slug: string;
  description: string | null;
  /** Collection banner, or the bundled fallback art. `null` renders a plain tile. */
  image: string | null;
  productCount: number;
}

/* ------------------------------------------------------------------ */
/* Shared scroll state                                                 */
/* ------------------------------------------------------------------ */
/**
 * The nav and the announcement bar both need to know whether the page has been
 * scrolled, and they are siblings rendered by a Server Component — so the state
 * lives in the scroll listener itself and both subscribe to it.
 *
 * `useSyncExternalStore` (rather than `useState` in an effect) also means the
 * value is correct on a mid-page reload, with no `setState`-in-effect cascade.
 */
const SCROLL_THRESHOLD = 40;

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function readScrolled(): boolean {
  return window.scrollY > SCROLL_THRESHOLD;
}

function readScrolledServer(): boolean {
  return false;
}

export function useScrolled(): boolean {
  return useSyncExternalStore(subscribeScroll, readScrolled, readScrolledServer);
}

/* ------------------------------------------------------------------ */

/**
 * Top-level links beside the mega-menu trigger.
 *
 * They reveal progressively: at `md` the row has to hold the nav, a centred
 * wordmark and four icon controls inside 768px, so only the two commerce links
 * fit without colliding with the wordmark. Everything hidden here is still one
 * click away in the mega-menu's "Explore" list and in the mobile drawer.
 */
interface NavLink {
  label: string;
  href: string;
  /** Breakpoint gate, desktop row only. */
  desktopClass?: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "New Arrivals", href: "/collections?tags=new" },
  { label: "Style Quiz", href: "/style-quiz", desktopClass: "hidden lg:inline-block" },
  { label: "About", href: "/about", desktopClass: "hidden xl:inline-block" },
];

/** Secondary destinations, surfaced inside the mega-menu panel. */
const EXPLORE_LINKS: NavLink[] = [
  { label: "Style Quiz", href: "/style-quiz" },
  { label: "About the House", href: "/about" },
  { label: "Track Order", href: "/track" },
];

const MEGA_PANEL_ID = "nav-collections-panel";

interface NavBarClientProps {
  collections: NavCollection[];
  /** Server-rendered `<AnnouncementBar />`, mounted inside the fixed chrome. */
  announcement: ReactNode;
}

export function NavBarClient({ collections, announcement }: NavBarClientProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const scrolled = useScrolled();
  const reduceMotion = useReducedMotion();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  const { totalItems, openCart } = useCartStore();
  const { data: session } = useSession();
  const openAuth = useAuthModal((s) => s.open);
  const openSearch = useUIStore((s) => s.openSearch);
  const openStylist = useUIStore((s) => s.openStylist);
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

  const chromeRef = useRef<HTMLDivElement>(null);
  const megaTriggerRef = useRef<HTMLAnchorElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Transparent-over-hero is the homepage's resting state only: once the page
  // has moved, or the mega-menu has dropped an ivory panel underneath, the bar
  // needs its own solid surface or the two read as separate elements.
  const overHero = isHome && !scrolled && !megaOpen;
  const cartCount = totalItems();
  const hasMega = collections.length > 0;
  const tiles = collections.filter((c) => c.image).slice(0, 4);

  const closeDrawer = () => setMobileOpen(false);

  /**
   * Publish the at-rest chrome height as `--chrome-h` on the document root, so
   * pages can clear the header with `pt-[var(--chrome-h,112px)]` instead of a
   * hard-coded pixel count that goes stale whenever the chrome changes.
   *
   * Only measured while the page is at rest: once scrolled, the announcement
   * bar collapses and the live height is *smaller* than the padding a page
   * needs at scroll-top, so the last resting value is the one to keep.
   */
  useEffect(() => {
    const el = chromeRef.current;
    if (!el || scrolled) return;
    const root = document.documentElement;
    const write = () => root.style.setProperty("--chrome-h", `${el.offsetHeight}px`);
    write();
    const observer = new ResizeObserver(write);
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrolled]);

  /**
   * Scroll lock for the mobile drawer.
   *
   * `overflow: hidden` on <body> alone does not hold on iOS Safari — the page
   * still rubber-bands behind the overlay and jumps back to the top on close.
   * Pinning the body at its current offset is the fix; the offset is restored
   * (not re-computed) when the drawer closes.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const { body } = document;
    const y = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, y);
    };
  }, [mobileOpen]);

  /** Escape closes the drawer; focus goes back to the button that opened it. */
  useEffect(() => {
    if (!mobileOpen) return;
    drawerCloseRef.current?.focus();
    const trigger = drawerTriggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      trigger?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  /* -------------------------------------------------------------- */
  /* Mega-menu (desktop only — mobile uses the drawer)               */
  /* -------------------------------------------------------------- */
  const onMegaKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !megaOpen) return;
    setMegaOpen(false);
    megaTriggerRef.current?.focus();
  };

  /**
   * Close once focus leaves the trigger *and* the panel. The panel is a DOM
   * descendant of the trigger wrapper, so it is reachable with Tab and focus
   * is never trapped inside it.
   */
  const onMegaBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setMegaOpen(false);
  };

  const linkClass = cn(
    "link-reveal font-sans text-[11px] font-medium tracking-[0.18em] uppercase transition-colors duration-300",
    overHero ? "text-white/85 hover:text-white" : "text-black hover:text-brand-gold"
  );
  /** 44px minimum touch target on every icon control. */
  const iconClass = cn(
    "grid h-11 w-11 place-items-center transition-colors duration-300",
    overHero ? "text-white/85 hover:text-brand-champagne" : "text-black hover:text-brand-gold"
  );

  return (
    <>
      <div
        ref={chromeRef}
        style={{ viewTransitionName: "site-header" }}
        className="fixed top-0 right-0 left-0 z-40 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        {announcement}

        <header
          className={cn(
            "relative border-b transition-colors duration-500",
            overHero ? "bg-transparent" : "bg-brand-ivory",
            // Flat chrome: a single hairline once the page has moved. No blur,
            // no drop shadow. The mega panel draws its own rule, so the header
            // stands down while it is open to avoid a double line.
            scrolled && !overHero && !megaOpen ? "border-brand-line" : "border-transparent"
          )}
        >
          <div className="shell">
            <div className="flex h-16 items-center justify-between sm:h-[76px]">
              {/* ---------------- Left: drawer trigger / desktop nav -------- */}
              <button
                ref={drawerTriggerRef}
                type="button"
                className={cn("-ml-3 md:hidden", iconClass)}
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
              >
                <Menu size={22} strokeWidth={1.5} aria-hidden="true" />
              </button>

              <nav
                className="hidden items-center gap-6 self-stretch md:flex xl:gap-8"
                aria-label="Primary"
              >
                {/* `static` (not `relative`) so the panel below positions itself
                    against the <header> and spans the full viewport width.
                    Full-height so the pointer never crosses dead space on its
                    way from the trigger down into the panel — the panel is a
                    DOM descendant, so `mouseleave` does not fire on entry. */}
                <div
                  className="static flex h-full items-center"
                  onMouseEnter={() => hasMega && setMegaOpen(true)}
                  onMouseLeave={() => setMegaOpen(false)}
                  onFocusCapture={() => hasMega && setMegaOpen(true)}
                  onBlur={onMegaBlur}
                  onKeyDown={onMegaKeyDown}
                >
                  <Link
                    ref={megaTriggerRef}
                    href="/collections"
                    className={linkClass}
                    transitionTypes={["nav-forward"]}
                    aria-expanded={hasMega ? megaOpen : undefined}
                    aria-controls={hasMega ? MEGA_PANEL_ID : undefined}
                  >
                    Collections
                  </Link>

                  <AnimatePresence>
                    {megaOpen && hasMega && (
                      <motion.div
                        id={MEGA_PANEL_ID}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                        transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full right-0 left-0 border-t border-b border-brand-line bg-brand-ivory"
                      >
                        <div className="shell grid grid-cols-[minmax(190px,240px)_1fr] gap-10 py-9">
                          <div>
                            <p className="eyebrow">The House</p>
                            <ul className="mt-4 flex flex-col">
                              {collections.map((c) => (
                                <li key={c.slug}>
                                  <Link
                                    href={`/collections/${c.slug}`}
                                    onClick={() => setMegaOpen(false)}
                                    transitionTypes={["nav-forward"]}
                                    className="group flex items-baseline justify-between gap-3 py-2 text-black transition-colors hover:text-brand-gold"
                                  >
                                    <span className="font-display text-lg leading-snug">
                                      {c.name}
                                    </span>
                                    {c.productCount > 0 && (
                                      <span className="font-sans text-[10px] tracking-luxe text-black/35">
                                        {c.productCount}
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              ))}
                              <li>
                                <Link
                                  href="/collections"
                                  onClick={() => setMegaOpen(false)}
                                  transitionTypes={["nav-forward"]}
                                  className="mt-3 inline-flex items-center gap-2 border-t border-brand-line pt-3 font-sans text-[11px] tracking-luxe text-brand-gold uppercase"
                                >
                                  View all
                                  <ChevronRight size={13} aria-hidden="true" />
                                </Link>
                              </li>
                            </ul>

                            {/* Keeps the links the narrower desktop row drops
                                reachable without opening another menu. */}
                            <p className="eyebrow mt-8">Explore</p>
                            <ul className="mt-3 flex flex-col">
                              {EXPLORE_LINKS.map((link) => (
                                <li key={link.href}>
                                  <Link
                                    href={link.href}
                                    onClick={() => setMegaOpen(false)}
                                    transitionTypes={["nav-forward"]}
                                    className="block py-1.5 font-sans text-[11px] tracking-luxe text-black/60 uppercase transition-colors hover:text-brand-gold"
                                  >
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            {tiles.map((c) => (
                              <Link
                                key={c.slug}
                                href={`/collections/${c.slug}`}
                                onClick={() => setMegaOpen(false)}
                                transitionTypes={["nav-forward"]}
                                className="group block"
                              >
                                <div className="relative aspect-[3/4] overflow-hidden bg-brand-ivory-deep">
                                  {c.image && (
                                    <Image
                                      src={c.image}
                                      alt=""
                                      fill
                                      className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.05]"
                                      sizes="(min-width: 1280px) 15vw, 20vw"
                                    />
                                  )}
                                </div>
                                <p className="mt-3 font-display text-base text-black transition-colors group-hover:text-brand-gold">
                                  {c.name}
                                </p>
                                {c.description && (
                                  <p className="mt-0.5 line-clamp-1 font-sans text-[10px] text-black/40">
                                    {c.description}
                                  </p>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={cn(linkClass, link.desktopClass)}
                    transitionTypes={["nav-forward"]}
                    onMouseEnter={() => setMegaOpen(false)}
                    onFocus={() => setMegaOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* ---------------- Centre: wordmark -------------------------- */}
              {/* Absolutely centred, and sized per breakpoint so it never meets
                  the nav on the left or the icon cluster on the right. */}
              <Link
                href="/"
                transitionTypes={["nav-back"]}
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 font-display whitespace-nowrap uppercase transition-colors duration-300",
                  // The glyphs are ~30px tall; the flex centring gives the link
                  // a 44px box so the home tap target clears the minimum.
                  "flex min-h-11 items-center",
                  "text-[1.15rem] tracking-[0.28em] sm:text-[1.3rem] sm:tracking-[0.34em] xl:text-[1.45rem] xl:tracking-[0.4em]",
                  overHero ? "text-white" : "text-black"
                )}
              >
                Dstyle
              </Link>

              {/* ---------------- Right: search + account cluster ----------- */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {/* A real, visible field on desktop — it opens the existing
                    overlay rather than being an input, so iOS never zooms and
                    SearchOverlay stays the single search implementation. */}
                <button
                  type="button"
                  onClick={openSearch}
                  aria-label="Search"
                  className={cn(
                    "mr-2 hidden h-10 w-[180px] items-center gap-2.5 border px-3 text-left transition-colors duration-300 lg:flex xl:w-[230px]",
                    overHero
                      ? "border-white/35 text-white/70 hover:border-white/70"
                      : "border-brand-line text-black/45 hover:border-brand-gold/60"
                  )}
                >
                  <Search size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span className="truncate font-sans text-[12px] tracking-[0.04em]">
                    Search couture&hellip;
                  </span>
                </button>

                <MagneticButton strength={0.5} maxDistance={14} className="lg:hidden">
                  <button type="button" className={iconClass} onClick={openSearch} aria-label="Search">
                    <Search size={19} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </MagneticButton>

                <MagneticButton strength={0.5} maxDistance={14} className="hidden sm:inline-block">
                  <Link href="/account/wishlist" className={iconClass} aria-label="Wishlist">
                    <Heart size={19} strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </MagneticButton>

                <MagneticButton strength={0.5} maxDistance={14} className="hidden md:inline-block">
                  {session?.user ? (
                    <Link href="/account" className={iconClass} aria-label="Account">
                      <User size={19} strokeWidth={1.5} aria-hidden="true" />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => openAuth()} className={iconClass} aria-label="Sign in">
                      <User size={19} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  )}
                </MagneticButton>

                <MagneticButton strength={0.5} maxDistance={14}>
                  <button
                    type="button"
                    className={cn("relative -mr-3 sm:mr-0", iconClass)}
                    onClick={openCart}
                    aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
                  >
                    <ShoppingBag size={19} strokeWidth={1.5} aria-hidden="true" />
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 1.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={cn(
                          "absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full font-sans text-[9px] font-semibold",
                          overHero ? "bg-brand-champagne text-brand-ink" : "bg-brand-gold text-white"
                        )}
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </button>
                </MagneticButton>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* ---------------- Mobile drawer ------------------------------------ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            role="dialog"
            aria-label="Site menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28 }}
            className="fixed inset-0 z-[55] flex h-[100dvh] flex-col bg-brand-ivory pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden"
          >
            <div className="shell flex h-16 shrink-0 items-center justify-between border-b border-brand-line">
              <span className="font-display text-xl tracking-[0.28em] uppercase">Dstyle</span>
              <button
                ref={drawerCloseRef}
                type="button"
                onClick={() => {
                  closeDrawer();
                  drawerTriggerRef.current?.focus();
                }}
                className="-mr-3 grid h-11 w-11 place-items-center"
                aria-label="Close menu"
              >
                <X size={22} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            {/* `data-lenis-prevent` keeps smooth-scroll off the drawer, and
                `overscroll-contain` stops the scroll chaining to the page. */}
            <div
              data-lenis-prevent
              className="shell flex-1 overflow-y-auto overscroll-contain pb-[calc(3rem+env(safe-area-inset-bottom))]"
            >
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  openStylist();
                }}
                style={{ backgroundColor: "var(--color-brand-champagne)" }}
                className="mt-4 flex min-h-11 w-full items-center gap-4 px-5 py-4 text-brand-ink ring-1 ring-brand-gold-deep/25"
              >
                <Sparkles size={20} className="shrink-0 text-brand-ink" aria-hidden="true" />
                <span className="flex-1 text-left">
                  <span className="block font-sans text-[14px] font-medium">Ask the Stylist</span>
                  <span className="mt-0.5 block text-[10px] tracking-luxe text-brand-ink/60 uppercase">
                    Tell us what you&rsquo;re dressing for
                  </span>
                </span>
                <ChevronRight size={16} className="text-brand-ink/40" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  openSearch();
                }}
                className="mt-3 flex min-h-11 w-full items-center gap-3 border border-brand-line px-5 py-3.5 text-brand-ink/45"
              >
                <Search size={17} strokeWidth={1.5} aria-hidden="true" />
                <span className="font-sans text-[14px]">Search couture&hellip;</span>
              </button>

              {collections.length > 0 && (
                <>
                  <p className="eyebrow mt-9 mb-4">Collections</p>
                  <div className="grid grid-cols-2 gap-3">
                    {collections.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/collections/${c.slug}`}
                        onClick={closeDrawer}
                        className="group relative block aspect-[4/5] overflow-hidden bg-brand-ivory-deep"
                      >
                        {c.image && (
                          <Image
                            src={c.image}
                            alt=""
                            fill
                            className="object-cover object-top"
                            sizes="45vw"
                          />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-brand-ink/75 via-brand-ink/10 to-transparent" />
                        <span className="absolute bottom-3 left-4 font-display text-xl text-white">
                          {c.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-9 flex flex-col border-t border-brand-line">
                {NAV_LINKS.concat({ label: "All Collections", href: "/collections" }).map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={closeDrawer}
                    className="flex min-h-11 items-center justify-between border-b border-brand-line py-4 font-sans text-[12px] tracking-luxe text-brand-ink uppercase transition-colors active:text-brand-gold"
                  >
                    {link.label}
                    <ChevronRight size={15} className="text-brand-gold" aria-hidden="true" />
                  </Link>
                ))}

                <Link
                  href="/account/wishlist"
                  onClick={closeDrawer}
                  className="flex min-h-11 items-center justify-between border-b border-brand-line py-4 font-sans text-[12px] tracking-luxe text-brand-ink uppercase"
                >
                  Wishlist
                  <ChevronRight size={15} className="text-brand-gold" aria-hidden="true" />
                </Link>

                {session?.user ? (
                  <Link
                    href="/account"
                    onClick={closeDrawer}
                    className="flex min-h-11 items-center justify-between border-b border-brand-line py-4 font-sans text-[12px] tracking-luxe text-brand-ink uppercase"
                  >
                    My Account
                    <ChevronRight size={15} className="text-brand-gold" aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer();
                      openAuth();
                    }}
                    className="flex min-h-11 items-center justify-between border-b border-brand-line py-4 font-sans text-[12px] tracking-luxe text-brand-ink uppercase"
                  >
                    Sign In
                    <ChevronRight size={15} className="text-brand-gold" aria-hidden="true" />
                  </button>
                )}

                {isStaff && (
                  <Link
                    href="/admin"
                    onClick={closeDrawer}
                    className="flex min-h-11 items-center justify-between border-b border-brand-line py-4 font-sans text-[12px] tracking-luxe text-brand-gold uppercase"
                  >
                    Admin Dashboard
                    <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </div>

              <a
                href="https://instagram.com/dipti__shahh"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeDrawer}
                className="mt-8 inline-flex min-h-11 items-center font-sans text-[11px] tracking-luxe text-brand-gold uppercase"
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
