import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

// Refresh the sitemap hourly so new products get indexed without a redeploy.
export const revalidate = 3600;

/** Product photos are absolute Cloudinary URLs; fixtures are site-relative. */
function toAbsoluteImage(url: string): string {
  return /^https?:\/\//.test(url) ? url : absoluteUrl(url);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/collections"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/style-quiz"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/track"), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const [collections, products] = await Promise.all([
      prisma.collection.findMany({
        where: { isVisible: true },
        select: { slug: true, bannerImage: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { isVisible: true },
        select: {
          slug: true,
          updatedAt: true,
          images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        },
      }),
    ]);

    const collectionRoutes: MetadataRoute.Sitemap = collections.map((c) => ({
      url: absoluteUrl(`/collections/${c.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
      ...(c.bannerImage ? { images: [toAbsoluteImage(c.bannerImage)] } : {}),
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
      // Image entries let Google Images index the catalogue directly — for a
      // visual store that's a real share of the traffic.
      ...(p.images.length > 0 ? { images: p.images.map((i) => toAbsoluteImage(i.url)) } : {}),
    }));

    return [...staticRoutes, ...collectionRoutes, ...productRoutes];
  } catch {
    // DB unavailable at build/request — still return the static routes.
    return staticRoutes;
  }
}
