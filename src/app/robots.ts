import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/transactional and API surfaces out of the index.
        disallow: ["/admin", "/api/", "/account", "/checkout"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
