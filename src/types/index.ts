import type { Role, OrderStatus } from "@/generated/prisma/client";

export type { Role, OrderStatus };

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface SKU {
  id: string;
  size: string;
  color: string | null;
  skuCode: string;
  stock: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  material: string | null;
  careInstr: string | null;
  basePrice: number;
  isVisible: boolean;
  isFeatured: boolean;
  tags: string[];
  collection: {
    id: string;
    name: string;
    slug: string;
  } | null;
  skus: SKU[];
  images: ProductImage[];
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
