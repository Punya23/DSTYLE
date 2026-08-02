"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export interface AccountNavItem {
  href: string;
  label: string;
  count?: number;
}

/**
 * Account sidebar. Collapses to a horizontally scrollable tab rail on mobile so
 * the nine sections stay reachable without a hamburger.
 */
export function AccountNav({ items }: { items: AccountNavItem[] }) {
  const pathname = usePathname() ?? "";

  const isActive = (href: string) =>
    href === "/account" ? pathname === "/account" : pathname.startsWith(href);

  return (
    <nav aria-label="Account sections" className="lg:sticky lg:top-[100px]">
      {/* Mobile: scrollable rail */}
      <ul className="lg:hidden -mx-6 flex gap-2 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap border px-3.5 py-2 text-[10px] font-sans tracking-luxe uppercase transition-colors",
                isActive(item.href)
                  ? "border-brand-ink bg-brand-ink text-brand-white"
                  : "border-brand-ivory-deep bg-white text-brand-ink hover:border-brand-gold"
              )}
            >
              {item.label}
              {item.count ? <span className="opacity-60">{item.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: stacked list */}
      <ul className="hidden lg:flex lg:flex-col">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "group flex items-center justify-between border-l-2 py-2.5 pl-4 pr-2 text-[11px] font-sans tracking-luxe uppercase transition-colors",
                isActive(item.href)
                  ? "border-brand-gold text-black"
                  : "border-transparent text-[#888888] hover:border-brand-ivory-deep hover:text-black"
              )}
            >
              {item.label}
              {item.count ? (
                <span className="text-[10px] font-mono text-[#aaaaaa]">{item.count}</span>
              ) : null}
            </Link>
          </li>
        ))}

        <li className="mt-6 border-t border-brand-ivory-deep pt-6 pl-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-[11px] font-sans tracking-luxe uppercase text-[#888888] transition-colors hover:text-brand-wine"
          >
            Sign out
          </button>
        </li>
      </ul>
    </nav>
  );
}
