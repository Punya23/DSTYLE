import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productCardSelect, toProductCard, type ProductCardData } from "@/lib/product-select";
import { AccountSection, EmptyState } from "@/components/account/AccountSection";
import { ProductCard } from "@/components/store/ProductCard";

export const metadata = { title: "Wishlist · Dstyle" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  let products: ProductCardData[] = [];
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id, product: { isVisible: true } },
      orderBy: { id: "desc" },
      select: { product: { select: productCardSelect } },
    });
    products = items.map((item) => toProductCard(item.product));
  } catch {
    products = [];
  }

  return (
    <AccountSection
      title="Wishlist"
      description="Tap the heart on any card to remove a piece."
    >
      {products.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          ctaHref="/collections"
          ctaLabel="Browse the collections"
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      )}
    </AccountSection>
  );
}
