import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

/**
 * AI Stylist — a Claude-backed couture concierge.
 *
 * Takes the running conversation, grounds Claude in the live Dstyle catalogue,
 * and returns a structured recommendation the frontend can render + navigate:
 *   { reply, collection, productSlugs }
 *
 * Degrades gracefully: with no ANTHROPIC_API_KEY (or on any error) it returns a
 * signal the client uses to fall back to its built-in keyword flow — so the
 * storefront never breaks or hangs waiting on the model.
 */

export const runtime = "nodejs";

const COLLECTIONS = ["bridal", "festive", "cocktail", "pret"] as const;

type IncomingMessage = { role: "user" | "assistant"; text: string };

// JSON-schema structured output — guarantees a parseable, valid shape.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "A warm, concise reply in the voice of a couture house concierge. 1–3 sentences. At most one tasteful emoji, usually none.",
    },
    collection: {
      type: "string",
      enum: [...COLLECTIONS, "none"],
      description:
        "The single most relevant collection to guide the shopper toward, or 'none' if the message is general chit-chat with no clear occasion yet.",
    },
    product_slugs: {
      type: "array",
      items: { type: "string" },
      description:
        "0–3 product slugs taken verbatim from the provided catalogue that best fit the shopper. Empty if nothing fits.",
    },
  },
  required: ["reply", "collection", "product_slugs"],
  additionalProperties: false,
};

async function loadCatalogue() {
  try {
    const products = await prisma.product.findMany({
      where: { isVisible: true },
      select: {
        name: true,
        slug: true,
        material: true,
        collection: { select: { slug: true, name: true } },
        skus: { select: { price: true } },
      },
      take: 60,
    });
    return products.map((p) => {
      const price = p.skus.length ? Math.min(...p.skus.map((s) => Number(s.price))) : null;
      return {
        name: p.name,
        slug: p.slug,
        collection: p.collection?.slug ?? "pret",
        material: p.material ?? "",
        price,
      };
    });
  } catch {
    return [] as Array<{ name: string; slug: string; collection: string; material: string; price: number | null }>;
  }
}

function buildSystemPrompt(catalogue: Awaited<ReturnType<typeof loadCatalogue>>) {
  const lines = catalogue.map(
    (p) =>
      `- ${p.name} — ${p.collection}${p.material ? ` · ${p.material}` : ""}${
        p.price != null ? ` · ₹${p.price.toLocaleString("en-IN")}` : ""
      } · slug: ${p.slug}`
  );
  const catalogueBlock = lines.length
    ? lines.join("\n")
    : "(catalogue temporarily unavailable — guide by collection only)";

  return `You are the personal stylist for Dstyle, a luxury Indian couture house by designer Dipti Shah — hand-embroidered bridal, festive, cocktail, and everyday-luxury (pret) wear.

Your job: understand what the shopper is dressing for and warmly guide them to the right pieces. Be a gracious, knowledgeable concierge — never pushy, never salesy. Keep replies short (1–3 sentences); the interface renders your product suggestions and a collection link separately, so do not list prices or slugs in your reply text.

The four collections:
- bridal — lehengas and couture for the bride
- festive — for weddings you attend, and every rasm and celebration
- cocktail — evening and reception glamour with an Indian soul
- pret — refined ready-to-wear for everyday

Current catalogue (recommend ONLY from these; use the exact slug):
${catalogueBlock}

For every message, choose the single collection that best fits (or "none" for general chit-chat with no occasion yet), and 0–3 product slugs from the catalogue that suit them. Only use slugs that appear above.`;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    // No credential configured — tell the client to use its offline keyword flow.
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  let incoming: IncomingMessage[] = [];
  try {
    const body = await req.json();
    incoming = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const messages: Anthropic.MessageParam[] = incoming
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .slice(-12) // keep the last few turns
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text.slice(0, 2000),
    }));

  if (messages.length === 0 || messages[0].role !== "user") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const catalogue = await loadCatalogue();
    const validSlugs = new Set(catalogue.map((p) => p.slug));
    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      // Latency-sensitive storefront chat: keep it snappy (low effort, no thinking).
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      system: [
        {
          type: "text",
          text: buildSystemPrompt(catalogue),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "refusal" }, { status: 422 });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "empty" }, { status: 502 });
    }

    const parsed = JSON.parse(textBlock.text) as {
      reply: string;
      collection: string;
      product_slugs: string[];
    };

    const collection =
      parsed.collection && parsed.collection !== "none" ? parsed.collection : null;
    const productSlugs = (parsed.product_slugs ?? [])
      .filter((s) => validSlugs.has(s))
      .slice(0, 3);

    return NextResponse.json({
      reply: parsed.reply?.trim() || "Tell me a little about the occasion and I'll point you to the right pieces.",
      collection,
      productSlugs,
    });
  } catch (err) {
    // Any model/parse error → client falls back to the keyword flow.
    console.error("[stylist] error:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
