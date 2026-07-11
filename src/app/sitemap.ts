import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Refresh the sitemap hourly so new products get indexed without a redeploy.
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/collections`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/style-quiz`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const products = await prisma.product.findMany({
      where: { isVisible: true },
      select: { slug: true, updatedAt: true },
    });
    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${BASE}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return [...staticRoutes, ...productRoutes];
  } catch {
    // DB unavailable at build/request — still return the static routes.
    return staticRoutes;
  }
}
