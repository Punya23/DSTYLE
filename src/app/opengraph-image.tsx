import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Site-wide social card. Inherited by every route that doesn't define its own,
 * so a shared link is never a blank preview. Drawn rather than loaded from a
 * file: no asset to keep in sync with the brand, and it renders at the edge in
 * a few milliseconds.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#17130f",
          color: "#faf7f2",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            letterSpacing: 28,
            textTransform: "uppercase",
            paddingLeft: 28,
          }}
        >
          {SITE.name}
        </div>
        <div style={{ width: 120, height: 1, background: "#b8935e", margin: "36px 0" }} />
        <div
          style={{
            fontSize: 28,
            letterSpacing: 12,
            textTransform: "uppercase",
            color: "#b8935e",
            paddingLeft: 12,
          }}
        >
          {SITE.tagline}
        </div>
        <div style={{ fontSize: 26, color: "#9a938a", marginTop: 48, fontStyle: "italic" }}>
          Bridal · Festive · Cocktail · Pret
        </div>
      </div>
    ),
    size
  );
}
