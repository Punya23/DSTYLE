/** How many products a "recently viewed" list keeps, guest or signed-in. */
export const MAX_RECENTLY_VIEWED = 24;

const STORAGE_KEY = "dstyle:recently-viewed";

/**
 * Guest history lives in localStorage as a newest-first list of product IDs.
 * Every helper degrades to a no-op when storage is unavailable (private mode,
 * SSR), so callers never need to guard.
 */
export function readGuestHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENTLY_VIEWED)
      : [];
  } catch {
    return [];
  }
}

/** Move `productId` to the front of the guest list and return the new list. */
export function pushGuestHistory(productId: string): string[] {
  const next = [productId, ...readGuestHistory().filter((id) => id !== productId)].slice(
    0,
    MAX_RECENTLY_VIEWED
  );
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked — the history is a nicety, not worth throwing.
    }
  }
  return next;
}

export function clearGuestHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — see above.
  }
}
