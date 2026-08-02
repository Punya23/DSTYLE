import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSection } from "@/components/account/AccountSection";
import {
  ReviewsManager,
  type ReviewableProduct,
  type WrittenReview,
} from "@/components/account/ReviewsManager";

export const metadata = { title: "Reviews · Dstyle" };

async function getReviewData(userId: string) {
  const [deliveredItems, reviews] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId, status: "DELIVERED" } },
      orderBy: { id: "desc" },
      select: {
        sku: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
              },
            },
          },
        },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          },
        },
      },
    }),
  ]);

  const reviewedIds = new Set(reviews.map((r) => r.product.id));

  // One entry per product, even when it was bought across several orders.
  const awaiting: ReviewableProduct[] = [];
  const seen = new Set<string>();
  for (const item of deliveredItems) {
    const product = item.sku.product;
    if (seen.has(product.id) || reviewedIds.has(product.id)) continue;
    seen.add(product.id);
    awaiting.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url ?? null,
    });
  }

  const written: WrittenReview[] = reviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    product: {
      id: review.product.id,
      name: review.product.name,
      slug: review.product.slug,
      image: review.product.images[0]?.url ?? null,
    },
  }));

  return { awaiting, written };
}

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  let data: { awaiting: ReviewableProduct[]; written: WrittenReview[] };
  try {
    data = await getReviewData(session.user.id);
  } catch {
    data = { awaiting: [], written: [] };
  }

  return (
    <AccountSection
      title="Reviews"
      description="You can review any piece once it has been delivered."
    >
      <ReviewsManager awaiting={data.awaiting} written={data.written} />
    </AccountSection>
  );
}
