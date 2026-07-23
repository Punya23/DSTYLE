import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Layers,
  LogOut,
} from "lucide-react";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Inventory", href: "/admin/inventory", icon: Layers },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: proxy.ts guards /admin at the edge, but authorization
  // must also be enforced server-side (per Next.js data-security guidance).
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "STAFF")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-brand-ivory">
      {/* Desktop sidebar (md+) */}
      <aside className="hidden md:flex w-56 shrink-0 bg-brand-ink text-white flex-col sticky top-0 h-screen">
        <div className="px-6 py-7 border-b border-white/10">
          <span className="font-display text-xl tracking-[0.24em] uppercase">Dstyle</span>
          <p className="text-[9px] font-sans tracking-luxe uppercase text-brand-champagne/70 mt-1">
            Atelier · Admin
          </p>
        </div>

        <nav className="flex-1 py-6 space-y-1 px-3">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-3 py-2.5 text-[11px] font-sans font-medium tracking-luxe uppercase text-white/55 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon size={15} className="group-hover:text-brand-champagne transition-colors" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-sans tracking-luxe uppercase text-white/40 hover:text-brand-champagne transition-colors"
          >
            View Store →
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-sans tracking-luxe uppercase text-white/40 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Content column */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar (below md) — the sidebar is hidden there, so the nav
            lives in a sticky header with a horizontally scrollable tab row. */}
        <div className="md:hidden sticky top-0 z-20 bg-brand-ink text-white">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg tracking-[0.22em] uppercase">Dstyle</span>
              <span className="text-[8px] font-sans tracking-luxe uppercase text-brand-champagne/70">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[10px] font-sans tracking-luxe uppercase text-white/50">
                Store
              </Link>
              <Link
                href="/api/auth/signout"
                aria-label="Sign out"
                className="text-white/50 hover:text-white transition-colors"
              >
                <LogOut size={16} />
              </Link>
            </div>
          </div>
          <nav className="flex gap-1 px-2 pb-2 overflow-x-auto hide-scrollbar border-t border-white/10 pt-2">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[10px] font-sans font-medium tracking-luxe uppercase text-white/60 hover:text-white bg-white/[0.06] transition-colors"
                >
                  <Icon size={13} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {children}
      </main>
    </div>
  );
}
