/**
 * Database seed — Dstyle couture catalogue.
 *
 * Idempotent: upserts by unique slug / skuCode / email, so it can be re-run
 * safely. Product images are matched to the real photos under /public.
 *
 * Run:  npx prisma db seed   (also runs automatically after `prisma migrate dev`)
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
const COLLECTIONS = [
  {
    name: "Bridal",
    slug: "bridal",
    description:
      "Heirloom lehengas and couture ensembles for the once-in-a-lifetime moments — hand-embroidered over months in our atelier.",
    bannerImage: "/collections/bridal.jpg",
    sortOrder: 0,
  },
  {
    name: "Festive",
    slug: "festive",
    description:
      "Celebration-ready silhouettes in jewel tones, mirror-work and zardozi — made to move through every rasm and ritual.",
    bannerImage: "/collections/festive.jpg",
    sortOrder: 1,
  },
  {
    name: "Cocktail",
    slug: "cocktail",
    description:
      "Contemporary evening wear — fluid anarkalis and sculpted sets that carry an Indian soul into the modern night.",
    bannerImage: "/collections/cocktail.jpg",
    sortOrder: 2,
  },
  {
    name: "Pret",
    slug: "pret",
    description:
      "Ready-to-wear luxury for the everyday — refined separates you can live in, layered with the House of Dstyle signature.",
    bannerImage: "/collections/pret.jpg",
    sortOrder: 3,
  },
];

// ---------------------------------------------------------------------------
// Products (names, slugs, SKUs & prices preserved from the live catalogue so
// existing lookbook / editorial links keep resolving)
// ---------------------------------------------------------------------------
type SeedSku = { size: string; color: string; skuCode: string; stock: number; price: number };
type SeedImg = { url: string; isVideo?: boolean };
type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  material: string | null;
  careInstr: string | null;
  basePrice: number;
  collectionSlug: string;
  isFeatured: boolean;
  tags: string[];
  skus: SeedSku[];
  images: SeedImg[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Tassel-Work Lehenga",
    slug: "tassel-work-lehenga",
    description:
      "A hand-embroidered gold bridal lehenga with a scalloped dupatta border and dense Kundan detailing. Each panel is worked in zardozi over silk organza — a masterpiece built for the sundown pheras.",
    material: "Silk · Organza · Zardozi",
    careInstr: "Dry clean only. Store flat in a muslin bag away from light.",
    basePrice: 85000,
    collectionSlug: "bridal",
    isFeatured: true,
    tags: ["new"],
    skus: [
      { size: "S", color: "Gold", skuCode: "DS-001-S", stock: 3, price: 85000 },
      { size: "M", color: "Gold", skuCode: "DS-001-M", stock: 2, price: 85000 },
    ],
    images: [
      { url: "/products/tassel-work-lehenga/01.jpg" },
      { url: "/products/tassel-work-lehenga/02.jpg" },
      { url: "/products/tassel-work-lehenga/03.jpg" },
      { url: "/hero/hero.mp4", isVideo: true },
    ],
  },
  {
    name: "Mirror-Work Lehenga",
    slug: "auspicious-hue-lehenga",
    description:
      "A peacock-teal lehenga wrapped in the richness of tradition — a mirror-work choli paired with a crushed-silk skirt that catches every auspicious hue.",
    material: "Silk · Mirror work",
    careInstr: "Dry clean only. Handle mirror-work with care.",
    basePrice: 92000,
    collectionSlug: "festive",
    isFeatured: true,
    tags: ["new"],
    skus: [
      { size: "S", color: "Teal", skuCode: "DS-002-S", stock: 4, price: 92000 },
      { size: "M", color: "Teal", skuCode: "DS-002-M", stock: 1, price: 92000 },
    ],
    images: [
      { url: "/products/auspicious-hue-lehenga/01.jpg" },
      { url: "/products/auspicious-hue-lehenga/02.jpg" },
      { url: "/products/festive-lehenga.mp4", isVideo: true },
    ],
  },
  {
    name: "Gold Potli Lehenga",
    slug: "ivory-zardozi-saree",
    description:
      "A gold-embellished lehenga with a maroon dupatta and matching potli — sequin-worked and light on the shoulder, made for the sangeet floor.",
    material: "Silk · Sequin work",
    careInstr: "Dry clean only.",
    basePrice: 45000,
    collectionSlug: "bridal",
    isFeatured: true,
    tags: [],
    skus: [{ size: "Free", color: "Gold", skuCode: "DS-003-F", stock: 5, price: 45000 }],
    images: [
      { url: "/products/ivory-zardozi-saree/01.jpg" },
      { url: "/products/ivory-zardozi-saree/02.jpg" },
    ],
  },
  {
    name: "Rose Gold Anarkali",
    slug: "emerald-anarkali",
    description:
      "A shimmering rose-gold anarkali with silver thread-work and mirror-work cuffs — a fluid floor-sweeping silhouette for the cocktail hour.",
    material: "Georgette · Silk",
    careInstr: "Dry clean only.",
    basePrice: 38000,
    collectionSlug: "cocktail",
    isFeatured: true,
    tags: ["new"],
    skus: [{ size: "M", color: "Rose Gold", skuCode: "DS-004-M", stock: 6, price: 38000 }],
    images: [
      { url: "/products/emerald-anarkali/01.jpg" },
      { url: "/products/emerald-anarkali/02.jpg" },
      { url: "/products/emerald-anarkali/03.jpg" },
    ],
  },
  {
    name: "Plum Tassel Set",
    slug: "sand-organza-dupatta",
    description:
      "A deep-plum satin set finished with a gold tassel hem and a grid-embroidered panel — understated couture for the intimate celebration.",
    material: "Satin · Gold thread",
    careInstr: "Dry clean recommended.",
    basePrice: 12000,
    collectionSlug: "pret",
    isFeatured: true,
    tags: [],
    skus: [{ size: "Free", color: "Plum", skuCode: "DS-005-F", stock: 10, price: 12000 }],
    images: [
      { url: "/products/sand-organza-dupatta/01.jpg" },
      { url: "/products/sand-organza-dupatta/02.jpg" },
      { url: "/products/sand-organza-dupatta/03.jpg" },
    ],
  },
  {
    name: "Rose Gold Sharara",
    slug: "rose-gold-sharara",
    description:
      "A contemporary rose-gold sharara set with a sequin dupatta border — flared, festive and effortless from mehndi to reception.",
    material: "Chiffon · Silk",
    careInstr: "Dry clean only.",
    basePrice: 52000,
    collectionSlug: "festive",
    isFeatured: true,
    tags: [],
    skus: [{ size: "S", color: "Rose Gold", skuCode: "DS-006-S", stock: 2, price: 52000 }],
    images: [
      { url: "/products/rose-gold-sharara/01.jpg" },
      { url: "/products/rose-gold-sharara/02.jpg" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Demo orders — only seeded when the store has none, so the admin dashboard,
// analytics, and order flows have realistic data to render on a fresh install.
// ---------------------------------------------------------------------------
const DEMO_ORDERS: {
  daysAgo: number;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  method: string;
  items: { skuCode: string; qty: number }[];
}[] = [
  { daysAgo: 0, status: "CONFIRMED", method: "Razorpay", items: [{ skuCode: "DS-005-F", qty: 1 }] },
  { daysAgo: 1, status: "PENDING", method: "COD", items: [{ skuCode: "DS-004-M", qty: 1 }] },
  { daysAgo: 2, status: "CONFIRMED", method: "Razorpay", items: [{ skuCode: "DS-001-S", qty: 1 }] },
  { daysAgo: 3, status: "SHIPPED", method: "Razorpay", items: [{ skuCode: "DS-006-S", qty: 1 }, { skuCode: "DS-005-F", qty: 1 }] },
  { daysAgo: 4, status: "DELIVERED", method: "COD", items: [{ skuCode: "DS-003-F", qty: 1 }] },
  { daysAgo: 5, status: "PROCESSING", method: "Razorpay", items: [{ skuCode: "DS-002-S", qty: 1 }] },
  { daysAgo: 6, status: "DELIVERED", method: "Razorpay", items: [{ skuCode: "DS-005-F", qty: 2 }] },
  { daysAgo: 7, status: "CONFIRMED", method: "COD", items: [{ skuCode: "DS-004-M", qty: 1 }] },
  { daysAgo: 9, status: "DELIVERED", method: "Razorpay", items: [{ skuCode: "DS-001-M", qty: 1 }] },
  { daysAgo: 10, status: "CANCELLED", method: "Razorpay", items: [{ skuCode: "DS-006-S", qty: 1 }] },
  { daysAgo: 11, status: "DELIVERED", method: "Razorpay", items: [{ skuCode: "DS-003-F", qty: 1 }, { skuCode: "DS-005-F", qty: 1 }] },
  { daysAgo: 13, status: "SHIPPED", method: "COD", items: [{ skuCode: "DS-002-M", qty: 1 }] },
];

async function seedDemoOrders() {
  const customer = await prisma.user.upsert({
    where: { email: "aanya.demo@dstyle.in" },
    update: {},
    create: { email: "aanya.demo@dstyle.in", name: "Aanya Kapoor", role: "CUSTOMER" },
  });

  const address = await prisma.address.create({
    data: {
      userId: customer.id,
      name: "Aanya Kapoor",
      line1: "14 Altamount Road",
      line2: "Cumballa Hill",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400026",
      phone: "9820098200",
      isDefault: true,
    },
  });

  const allSkus = await prisma.sKU.findMany();
  const bySkuCode = new Map(allSkus.map((s) => [s.skuCode, s]));

  for (const demo of DEMO_ORDERS) {
    const lineItems = demo.items
      .map((it) => {
        const sku = bySkuCode.get(it.skuCode);
        return sku ? { sku, qty: it.qty } : null;
      })
      .filter((x): x is { sku: (typeof allSkus)[number]; qty: number } => x !== null);
    if (lineItems.length === 0) continue;

    const subtotal = lineItems.reduce((sum, li) => sum + Number(li.sku.price) * li.qty, 0);
    const shipping = subtotal >= 5000 ? 0 : 299;
    const createdAt = new Date(Date.now() - demo.daysAgo * 24 * 60 * 60 * 1000);

    await prisma.order.create({
      data: {
        userId: customer.id,
        addressId: address.id,
        status: demo.status,
        paymentMethod: demo.method,
        totalAmount: subtotal + shipping,
        createdAt,
        updatedAt: createdAt,
        razorpayOrderId: demo.method === "Razorpay" ? `order_demo_${demo.daysAgo}_${Math.round(subtotal)}` : null,
        items: {
          create: lineItems.map((li) => ({
            skuId: li.sku.id,
            quantity: li.qty,
            priceSnap: li.sku.price,
          })),
        },
      },
    });
  }
}

async function main() {
  console.log("🌱  Seeding Dstyle catalogue…");

  // --- Admin user -----------------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@dstyle.in";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: { email: adminEmail, name: "Dstyle Admin", role: "ADMIN" },
  });
  console.log(`   ✓ admin user (${adminEmail})`);

  // --- Collections ----------------------------------------------------------
  const collectionIds = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const row = await prisma.collection.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        bannerImage: c.bannerImage,
        sortOrder: c.sortOrder,
        isVisible: true,
      },
      create: { ...c, isVisible: true },
    });
    collectionIds.set(c.slug, row.id);
  }
  console.log(`   ✓ ${COLLECTIONS.length} collections`);

  // --- Products, SKUs & images ---------------------------------------------
  for (const p of PRODUCTS) {
    const collectionId = collectionIds.get(p.collectionSlug) ?? null;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        material: p.material,
        careInstr: p.careInstr,
        basePrice: p.basePrice,
        collectionId,
        isFeatured: p.isFeatured,
        isVisible: true,
        tags: p.tags,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        material: p.material,
        careInstr: p.careInstr,
        basePrice: p.basePrice,
        collectionId,
        isFeatured: p.isFeatured,
        isVisible: true,
        tags: p.tags,
      },
    });

    // SKUs — upsert by unique skuCode
    for (const s of p.skus) {
      await prisma.sKU.upsert({
        where: { skuCode: s.skuCode },
        update: { size: s.size, color: s.color, stock: s.stock, price: s.price, productId: product.id },
        create: { ...s, productId: product.id },
      });
    }

    // Images — reset & recreate so ordering stays deterministic
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: p.images.map((img, i) => ({
        productId: product.id,
        url: img.url,
        altText: `${p.name} — view ${i + 1}`,
        sortOrder: i,
        isPrimary: i === 0,
      })),
    });
  }
  console.log(`   ✓ ${PRODUCTS.length} products with SKUs & images`);

  // --- Demo orders (only when the store has none) ---------------------------
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    await seedDemoOrders();
    console.log(`   ✓ ${DEMO_ORDERS.length} demo orders`);
  } else {
    console.log(`   • ${existingOrders} orders already present — skipping demo orders`);
  }

  console.log("✅  Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
