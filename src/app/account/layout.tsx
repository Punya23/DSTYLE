import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountNav, type AccountNavItem } from "@/components/account/AccountNav";

export const metadata = {
  title: "My Account · Dstyle",
};

/** Counts shown next to the nav labels. Never throws — a DB hiccup just hides them. */
async function getCounts(userId: string) {
  try {
    const [orders, addresses, wishlist, reviews, returns] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.address.count({ where: { userId } }),
      prisma.wishlistItem.count({ where: { userId } }),
      prisma.review.count({ where: { userId } }),
      prisma.returnRequest.count({ where: { userId } }),
    ]);
    return { orders, addresses, wishlist, reviews, returns };
  } catch {
    return { orders: 0, addresses: 0, wishlist: 0, reviews: 0, returns: 0 };
  }
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/?authRequired=1&callbackUrl=/account");

  const counts = await getCounts(session.user.id);

  const items: AccountNavItem[] = [
    { href: "/account", label: "Overview" },
    { href: "/account/profile", label: "Profile" },
    { href: "/account/orders", label: "Orders", count: counts.orders },
    { href: "/account/track", label: "Track Order" },
    { href: "/account/addresses", label: "Addresses", count: counts.addresses },
    { href: "/account/wishlist", label: "Wishlist", count: counts.wishlist },
    { href: "/account/reviews", label: "Reviews", count: counts.reviews },
    { href: "/account/returns", label: "Returns", count: counts.returns },
    { href: "/account/invoices", label: "Invoices" },
    { href: "/account/recently-viewed", label: "Recently Viewed" },
  ];

  return (
    <div className="pt-[72px] min-h-screen bg-brand-ivory">
      <div className="mx-auto max-w-[1200px] px-6 py-12 lg:px-12 lg:py-16">
        <header className="mb-10">
          <p className="mb-2 text-[11px] font-sans tracking-luxe uppercase text-brand-gold">
            Welcome back
          </p>
          <h1 className="font-display italic text-4xl text-black lg:text-5xl">
            {session.user.name ?? "My Account"}
          </h1>
          <p className="mt-2 text-[12px] font-sans text-[#888888]">{session.user.email}</p>
          <span className="mt-6 block h-px w-16 gold-rule-solid opacity-60" />
        </header>

        <div className="grid gap-10 lg:grid-cols-[200px_1fr] lg:gap-16">
          <AccountNav items={items} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
