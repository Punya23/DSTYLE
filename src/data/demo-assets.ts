import type { ProductImage } from "@/types";

function productImages(
  slug: string,
  files: string[],
  alt: string,
  extra?: ProductImage[]
): ProductImage[] {
  const photos = files.map((file, i) => ({
    id: `${slug}-img-${i}`,
    url: `/products/${slug}/${file}`,
    altText: `${alt} — view ${i + 1}`,
    sortOrder: i,
    isPrimary: i === 0,
  }));
  return extra ? [...photos, ...extra.map((e, i) => ({ ...e, sortOrder: photos.length + i }))] : photos;
}

export const COLLECTION_BANNERS: Record<string, string> = {
  bridal: "/collections/bridal.jpg",
  festive: "/collections/festive.jpg",
  cocktail: "/collections/cocktail.jpg",
  pret: "/collections/pret.jpg",
};

export const BRAND_STORY_IMAGE = "/brand/story.jpg";

export const ABOUT_HERO_IMAGES = [
  "/brand/story.jpg",
  "/editorial/03.jpg",
  "/editorial/06.jpg",
  "/editorial/05.jpg",
];

export const LOOKBOOK_IMAGES = [
  { id: "1", image: "/lookbook/01.jpg", productName: "Gold Bridal Lehenga", productSlug: "tassel-work-lehenga" },
  { id: "2", image: "/lookbook/02.jpg", productName: "Teal Mirror Lehenga", productSlug: "auspicious-hue-lehenga" },
  { id: "3", image: "/lookbook/03.jpg", productName: "Plum Festive Set", productSlug: "sand-organza-dupatta" },
  { id: "4", image: "/lookbook/04.jpg", productName: "Gold Potli Lehenga", productSlug: "ivory-zardozi-saree" },
  { id: "5", image: "/lookbook/05.jpg", productName: "Rose Gold Anarkali", productSlug: "emerald-anarkali" },
  { id: "6", image: "/lookbook/06.jpg", productName: "Atelier Moment", productSlug: "tassel-work-lehenga" },
];

export const EDITORIAL_ITEMS = [
  { id: "1", title: "House of Dstyle", subtitle: "Campaign", image: "/editorial/03.jpg" },
  { id: "2", title: "Festive Edit", subtitle: "Editorial", image: "/editorial/04.jpg" },
  { id: "3", title: "Seen at Dior", subtitle: "Event", image: "/editorial/01.jpg" },
  { id: "4", title: "Family Couture", subtitle: "Celebration", image: "/editorial/02.jpg" },
  { id: "5", title: "The Pret Edit", subtitle: "Lookbook", image: "/editorial/05.jpg" },
  { id: "6", title: "Bridal Season", subtitle: "Campaign", image: "/editorial/06.jpg" },
];

export const EXPERIENCE_BANNER = "/collections/bridal.jpg";

export const EXPERIENCE_CARDS = [
  { id: "shop", image: "/products/emerald-anarkali/01.jpg" },
  { id: "detail", image: "/products/auspicious-hue-lehenga/01.jpg" },
  { id: "account", image: "/products/sand-organza-dupatta/02.jpg" },
];

/** Build multi-angle image sets per POC product */
export function getPocProductImages(slug: string, name: string): ProductImage[] {
  switch (slug) {
    case "tassel-work-lehenga":
      return productImages(slug, ["01.jpg", "02.jpg", "03.jpg"], name, [
        {
          id: `${slug}-video`,
          url: "/hero/hero.mp4",
          altText: `${name} — film`,
          sortOrder: 3,
          isPrimary: false,
        },
      ]);
    case "auspicious-hue-lehenga":
      return productImages(slug, ["01.jpg", "02.jpg"], name, [
        {
          id: `${slug}-video`,
          url: "/products/festive-lehenga.mp4",
          altText: `${name} — film`,
          sortOrder: 2,
          isPrimary: false,
        },
      ]);
    case "ivory-zardozi-saree":
      return productImages(slug, ["01.jpg", "02.jpg"], name);
    case "emerald-anarkali":
      return productImages(slug, ["01.jpg", "02.jpg", "03.jpg"], name);
    case "sand-organza-dupatta":
      return productImages(slug, ["01.jpg", "02.jpg", "03.jpg"], name);
    case "rose-gold-sharara":
      return productImages(slug, ["01.jpg", "02.jpg"], name);
    default:
      return [];
  }
}
