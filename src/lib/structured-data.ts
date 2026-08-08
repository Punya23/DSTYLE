import { SITE, absoluteUrl, metaDescription } from "@/lib/seo";
import {
  CURRENCY,
  SHIPPING_FLAT,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COUNTRY,
  HANDLING_DAYS,
  TRANSIT_DAYS,
} from "@/lib/shipping";
import { RETURN_WINDOW_DAYS } from "@/lib/account";
import { COMPANY } from "@/lib/company";

/**
 * JSON-LD builders. Everything here mirrors what the site actually does —
 * prices, stock, shipping cost and the returns window all come from the same
 * constants the checkout uses. Structured data that contradicts the page is
 * worse than none: Google Merchant Center suspends accounts over it.
 */

type Json = Record<string, unknown>;

/** Publisher identity. Referenced by @id from the other graphs. */
export function organizationSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon.svg"),
    },
    description: SITE.description,
    sameAs: [...SITE.sameAs],
    // A verifiable postal address and a reachable support line are what
    // separate a merchant Google will surface from an anonymous storefront.
    address: {
      "@type": "PostalAddress",
      streetAddress: [COMPANY.address.line1, COMPANY.address.line2].join(", "),
      addressLocality: COMPANY.address.city,
      addressRegion: COMPANY.address.state,
      postalCode: COMPANY.address.postalCode,
      addressCountry: COMPANY.address.countryCode,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: COMPANY.phone,
      email: COMPANY.supportEmail,
      areaServed: COMPANY.address.countryCode,
      availableLanguage: ["en", "hi"],
    },
  };
}

/**
 * FAQPage schema. Google only renders the rich result when the answers are
 * plain text that matches what a visitor can actually read on the page, so the
 * same strings feed both.
 */
export function faqSchema(faqs: readonly { question: string; answer: string }[], path: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteUrl(path)}#faq`,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** Contact page marker, tied back to the publisher identity. */
export function contactPageSchema(path: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: absoluteUrl(path),
    isPartOf: { "@id": `${absoluteUrl("/")}#website` },
    about: { "@id": `${absoluteUrl("/")}#organization` },
  };
}

/** Enables the sitelinks search box in Google results. */
export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: SITE.name,
    url: absoluteUrl("/"),
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/collections")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/**
 * Shipping and returns, spelled out the way Merchant Center wants them.
 * Free delivery above the threshold is expressed as a second rate tier rather
 * than a separate offer, which is how Google models conditional free shipping.
 */
function shippingDetails(): Json[] {
  const deliveryTime = {
    "@type": "ShippingDeliveryTime",
    handlingTime: {
      "@type": "QuantitativeValue",
      minValue: HANDLING_DAYS.min,
      maxValue: HANDLING_DAYS.max,
      unitCode: "DAY",
    },
    transitTime: {
      "@type": "QuantitativeValue",
      minValue: TRANSIT_DAYS.min,
      maxValue: TRANSIT_DAYS.max,
      unitCode: "DAY",
    },
  };
  const destination = {
    "@type": "DefinedRegion",
    addressCountry: SHIPPING_COUNTRY,
  };

  return [
    {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: SHIPPING_FLAT,
        currency: CURRENCY,
      },
      shippingDestination: destination,
      deliveryTime,
    },
    {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: 0,
        currency: CURRENCY,
      },
      shippingDestination: destination,
      deliveryTime,
      // Orders at or above the threshold ship free.
      eligibleTransactionVolume: {
        "@type": "PriceSpecification",
        minPrice: FREE_SHIPPING_THRESHOLD,
        priceCurrency: CURRENCY,
      },
    },
  ];
}

function returnPolicy(): Json {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: SHIPPING_COUNTRY,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: RETURN_WINDOW_DAYS,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
  };
}

export interface ProductSchemaInput {
  name: string;
  slug: string;
  description: string;
  material?: string | null;
  images: { url: string }[];
  collectionName?: string | null;
  skus: { skuCode: string; size: string; color: string | null; price: number; stock: number }[];
  basePrice: number;
  rating?: { average: number; count: number } | null;
  reviews?: {
    rating: number;
    title: string | null;
    body: string;
    createdAt: Date | string;
    author: string;
  }[];
}

/**
 * Product schema with offers. Sizes are modelled as one offer each so Google
 * sees real per-variant availability, wrapped in an AggregateOffer that carries
 * the price range shown on the page.
 */
export function productSchema(p: ProductSchemaInput): Json {
  const url = absoluteUrl(`/products/${p.slug}`);
  const prices = p.skus.length > 0 ? p.skus.map((s) => s.price) : [p.basePrice];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const inStock = p.skus.some((s) => s.stock > 0);

  // Merchant Center rejects offers whose price could already be stale, so
  // commit to the current price for a bounded window.
  const priceValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const offerBase = {
    priceCurrency: CURRENCY,
    itemCondition: "https://schema.org/NewCondition",
    url,
    priceValidUntil,
    shippingDetails: shippingDetails(),
    hasMerchantReturnPolicy: returnPolicy(),
    seller: { "@id": `${absoluteUrl("/")}#organization` },
  };

  const offers =
    p.skus.length > 0
      ? {
          "@type": "AggregateOffer",
          offerCount: p.skus.length,
          lowPrice: low,
          highPrice: high,
          priceCurrency: CURRENCY,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          offers: p.skus.map((sku) => ({
            "@type": "Offer",
            ...offerBase,
            sku: sku.skuCode,
            name: [sku.size, sku.color].filter(Boolean).join(" · "),
            price: sku.price,
            availability:
              sku.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            inventoryLevel: { "@type": "QuantitativeValue", value: sku.stock },
          })),
        }
      : {
          "@type": "Offer",
          ...offerBase,
          price: p.basePrice,
          availability: "https://schema.org/InStock",
        };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    url,
    description: metaDescription(p.description, 5000),
    image: p.images.map((i) => i.url),
    sku: p.skus[0]?.skuCode,
    brand: { "@type": "Brand", name: SITE.name },
    ...(p.collectionName ? { category: p.collectionName } : {}),
    ...(p.material ? { material: p.material } : {}),
    offers,
    ...(p.rating && p.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(p.rating.average.toFixed(2)),
            reviewCount: p.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(p.reviews?.length
      ? {
          review: p.reviews.map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            ...(r.title ? { name: r.title } : {}),
            reviewBody: r.body,
            datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
            author: { "@type": "Person", name: r.author },
          })),
        }
      : {}),
  };
}

export interface ListItemInput {
  name: string;
  path: string;
  image?: string;
  price?: number;
}

/** Category/listing pages: the products, in the order they're displayed. */
export function itemListSchema(items: ListItemInput[], listName: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(item.path),
      name: item.name,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

export function collectionPageSchema(name: string, description: string, path: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description: metaDescription(description, 300),
    url: absoluteUrl(path),
    isPartOf: { "@id": `${absoluteUrl("/")}#website` },
  };
}
