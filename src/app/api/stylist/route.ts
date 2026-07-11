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

// Model is overridable so the shop can trade cost vs. depth without a code change.
// Haiku 4.5 is the default: fast + inexpensive, which suits a storefront concierge
// and a small token budget. Set STYLIST_MODEL to a Sonnet/Opus id for richer replies.
const STYLIST_MODEL = process.env.STYLIST_MODEL || "claude-haiku-4-5-20251001";

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

  return `You are the personal stylist for Dstyle, a luxury Indian couture house by designer Dipti Shah — hand-embroidered bridal, festive, cocktail, and everyday-luxury (pret) wear. You speak like a warm, discerning human stylist who has dressed many brides and their families: gracious and personal, never scripted or salesy. Every shopper is different — talk to *this* one.

How you help:
- Have a real conversation. When you don't yet know enough to recommend well — the occasion, her role (the bride herself, a guest, family of the couple), her budget, the colours or fabrics she loves, the season or city — ask ONE warm, specific follow-up question instead of guessing. When you ask a question, set collection to "none" and return an empty product_slugs list.
- Use every detail she shares. If she names a budget in ₹, stay within it and say so gently. If she mentions a colour, a fabric, wanting comfort for a long function, or that she runs warm — factor it in and tell her *why* a piece suits her.
- Offer a touch of genuine styling insight — how a drape falls, what silhouette flatters, what pairs well, what's easy to carry through a long day — but keep it light and unforced.
- When you have enough to go on, pick the single best-fitting collection and 1–3 real pieces (exact slugs from the catalogue below) that match her occasion and budget.

Voice: warm and concise, 1–3 sentences. At most one tasteful emoji, and usually none. The interface renders the product cards and a collection link for you, so never quote prices or slugs in your reply text — just speak to her naturally.

The four collections:
- bridal — lehengas and couture for the bride herself
- festive — for the weddings you attend, and every rasm and celebration
- cocktail — evening and reception glamour with an Indian soul
- pret — refined ready-to-wear for every day

Current catalogue (recommend ONLY from these; use the exact slug):
${catalogueBlock}

Never invent pieces that aren't listed. If nothing genuinely fits her budget or brief, say so kindly and point her to the closest collection rather than forcing a match.`;
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
      model: STYLIST_MODEL,
      max_tokens: 640,
      // Structured output guarantees a parseable { reply, collection, product_slugs }.
      // No `effort`/thinking here — this is latency-sensitive storefront chat.
      output_config: {
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
