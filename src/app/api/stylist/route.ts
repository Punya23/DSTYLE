import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { groqConfigured, groqJSON } from "@/lib/groq";

/**
 * AI Stylist — a Groq-backed couture concierge.
 *
 * Takes the running conversation, grounds the model in the live Dstyle catalogue,
 * and returns a structured recommendation the frontend can render + navigate:
 *   { reply, collection, productSlugs }
 *
 * Degrades gracefully: with no GROQ_API_KEY (or on any error) it returns a signal
 * the client uses to fall back to its built-in keyword flow — so the storefront
 * never breaks or hangs waiting on the model.
 */

export const runtime = "nodejs";

const COLLECTIONS = ["bridal", "festive", "cocktail", "pret"] as const;

type IncomingMessage = { role: "user" | "assistant"; text: string };

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
- Have a real conversation, but move to recommendations quickly. Ask ONE warm follow-up ONLY when the occasion itself is still unclear (e.g. "I need an outfit" with no context). The MOMENT you know the occasion AND at least one preference — her role, a colour, a budget, a fabric, or a vibe — recommend real pieces instead of asking another question. Don't ask two questions in a row. When you do ask a question, set collection to "none" and return an empty product_slugs list.
- Use every detail she shares. If she names a budget in ₹, stay within it and say so gently. If she mentions a colour, a fabric, wanting comfort for a long function, or that she runs warm — factor it in and tell her *why* a piece suits her. If she names a colour, actively prefer pieces in or near that colour.
- Offer a touch of genuine styling insight — how a drape falls, what silhouette flatters, what pairs well, what's easy to carry through a long day — but keep it light and unforced.
- When you recommend, pick the single best-fitting collection and 1–3 real pieces (exact slugs from the catalogue below) that match her occasion, colour and budget. Prefer giving picks over asking a second question.

Voice: warm and concise, 1–3 sentences. At most one tasteful emoji, and usually none.

CRITICAL — how to refer to pieces in your reply: the interface renders the product cards and a collection link for you. In your reply text, describe pieces ONLY by colour, fabric and silhouette — e.g. "this royal blue sequinned saree" or "a soft ivory-and-gold lehenga." NEVER write a specific product name (no "Rose Gold Anarkali", no capitalised piece names), never quote prices, never quote slugs. The cards below your message show her the exact pieces, so let them do that job.

The four collections:
- bridal — lehengas and couture for the bride herself
- festive — for the weddings you attend, and every rasm and celebration
- cocktail — evening and reception glamour with an Indian soul
- pret — refined ready-to-wear for every day

Current catalogue (recommend ONLY from these; use the exact slug):
${catalogueBlock}

Never invent pieces that aren't listed. If nothing genuinely fits her budget or brief, say so kindly and point her to the closest collection rather than forcing a match.

Respond ONLY with a JSON object of exactly this shape, nothing else:
{
  "reply": string,                       // your warm 1–3 sentence message to her
  "collection": "bridal" | "festive" | "cocktail" | "pret" | "none",
  "product_slugs": string[]              // 0–3 exact slugs from the catalogue above
}`;
}

type StylistJSON = { reply: string; collection: string; product_slugs: string[] };

export async function POST(req: Request) {
  if (!groqConfigured()) {
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

  const convo = incoming
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .slice(-12) // keep the last few turns
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.text.slice(0, 2000),
    }));

  // Drop any leading assistant turns so the first message is the user's.
  while (convo.length && convo[0].role !== "user") convo.shift();
  if (convo.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const catalogue = await loadCatalogue();
  const validSlugs = new Set(catalogue.map((p) => p.slug));

  const parsed = await groqJSON<StylistJSON>({
    messages: [{ role: "system", content: buildSystemPrompt(catalogue) }, ...convo],
    temperature: 0.65,
    maxTokens: 640,
  });

  if (!parsed || typeof parsed.reply !== "string") {
    // Model/parse error → client falls back to the keyword flow.
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const collection =
    parsed.collection && parsed.collection !== "none" && COLLECTIONS.includes(parsed.collection as (typeof COLLECTIONS)[number])
      ? parsed.collection
      : null;
  const productSlugs = (parsed.product_slugs ?? [])
    .filter((s) => typeof s === "string" && validSlugs.has(s))
    .slice(0, 3);

  return NextResponse.json({
    reply:
      parsed.reply?.trim() ||
      "Tell me a little about the occasion and I'll point you to the right pieces.",
    collection,
    productSlugs,
  });
}
