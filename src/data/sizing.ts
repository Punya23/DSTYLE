/**
 * House sizing, shared by the size-guide dialog on a product page and the
 * standalone `/size-guide` page.
 *
 * These are *body* measurements, not garment measurements, and they are the
 * same for every piece — a per-garment table would have to be invented, and an
 * invented measurement is the one mistake a couture shopper never forgives.
 * Ease varies by cut, which the note under each table says out loud.
 */

export interface SizeRow {
  size: string;
  /** Inches. */
  bust: number;
  waist: number;
  hip: number;
}

export const SIZE_ROWS: readonly SizeRow[] = [
  { size: "XS", bust: 32, waist: 26, hip: 35 },
  { size: "S", bust: 34, waist: 28, hip: 37 },
  { size: "M", bust: 36, waist: 30, hip: 39 },
  { size: "L", bust: 38, waist: 32, hip: 41 },
  { size: "XL", bust: 40, waist: 34, hip: 43 },
  { size: "XXL", bust: 42, waist: 36, hip: 45 },
];

export const HOW_TO_MEASURE: ReadonlyArray<[string, string]> = [
  ["Bust", "Around the fullest part, tape level and not pulled tight."],
  ["Waist", "Around the narrowest part of the torso, just above the navel."],
  ["Hip", "Around the fullest part, roughly 8 inches below the waist."],
];

/** Inches to centimetres, for the alternate column on the full page. */
export function toCm(inches: number): number {
  return Math.round(inches * 2.54);
}

/** Fit guidance that differs by silhouette — the thing customers actually ask. */
export const FIT_NOTES: ReadonlyArray<{ silhouette: string; note: string }> = [
  {
    silhouette: "Lehenga",
    note: "The skirt is cut to a waist measurement and the blouse to a bust measurement, so order by whichever is furthest from your usual size — we can take a waist in, but we cannot let one out past the seam allowance.",
  },
  {
    silhouette: "Saree blouse",
    note: "Cut close. Take the larger size if you are between two, and tell us your under-bust measurement if you want it altered before dispatch.",
  },
  {
    silhouette: "Anarkali & kurta",
    note: "Flowing through the body, fitted at the bust. Between two sizes, the smaller usually reads better.",
  },
  {
    silhouette: "Gown",
    note: "Fitted at bust and waist, with a boned bodice on most pieces. Order to your largest measurement.",
  },
];
