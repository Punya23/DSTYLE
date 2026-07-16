"use client";

import { usePathname } from "next/navigation";
import { PageTransition } from "./PageTransition";
import { SearchOverlay } from "./SearchOverlay";
import { StylistConcierge } from "./StylistConcierge";

/**
 * Renders the storefront chrome (nav + footer) around page content — except on
 * the /admin routes, which supply their own sidebar shell. Nav and footer are
 * passed in as elements from the server layout so this stays RSC-safe.
 */
export function ConditionalChrome({
  nav,
  footer,
  children,
}: {
  nav: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="relative z-10 w-full min-w-0">{children}</main>;
  }

  return (
    <>
      {nav}
      <main className="relative z-10 bg-brand-ivory w-full min-w-0 rounded-b-[28px] sm:rounded-b-[40px] shadow-[0_40px_70px_-30px_rgba(23,19,15,0.35)]">
        <PageTransition>{children}</PageTransition>
      </main>
      {footer}
      <SearchOverlay />
      <StylistConcierge />
    </>
  );
}
