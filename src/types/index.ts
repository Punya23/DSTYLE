import type { Role, OrderStatus } from "@/generated/prisma/client";

export type { Role, OrderStatus };

export type ImageKind =
  | "FRONT"
  | "BACK"
  | "SIDE"
  | "CLOSEUP"
  | "FABRIC"
  | "MODEL"
  | "LIFESTYLE"
  | "OTHER";

export type VideoKind = "REEL" | "ROTATION_360" | "RAMP_WALK" | "DETAIL";

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  /** Shot type — drives gallery ordering and captions. */
  kind?: ImageKind;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVideo {
  id: string;
  url: string;
  posterUrl: string | null;
  kind: VideoKind;
  durationSec: number | null;
  sortOrder: number;
}

export interface SKU {
  id: string;
  size: string;
  color: string | null;
  skuCode: string;
  stock: number;
  price: number;
  /** Manual kill-switch; stock 0 disables a size on its own. */
  isActive?: boolean;
  lowStockAt?: number;
  sortOrder?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  isVisible: boolean;
  isFeatured: boolean;
  tags: string[];

  // Fashion attributes
  material: string | null;
  fabric?: string | null;
  sleeve?: string | null;
  neck?: string | null;
  length?: string | null;
  careInstr: string | null;
  deliveryTime?: string | null;

  collection: {
    id: string;
    name: string;
    slug: string;
  } | null;
  skus: SKU[];
  images: ProductImage[];
  videos?: ProductVideo[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerImage: string | null;
  sortOrder: number;
  _count?: { products: number };
}

export interface CartItem {
  skuId: string;
  productId: string;
  productName: string;
  productSlug: string;
  image: string;
  size: string;
  color: string | null;
  price: number;
  quantity: number;
  stock: number;
}

export interface OrderWithItems {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    priceSnap: number;
    sku: {
      size: string;
      color: string | null;
      product: {
        name: string;
        slug: string;
        images: ProductImage[];
      };
    };
  }[];
}

declare module "next-auth" {
  interface User {
    id?: string;
    role?: Role;
  }
  interface Session {
    user: User & {
      id: string;
      role: Role;
    };
  }
}

// Note: next-auth's JWT already extends Record<string, unknown>, so `token.id`
// / `token.role` are assignable without a module augmentation (that subpath
// isn't resolvable under moduleResolution "bundler").
