/**
 * Absolute base URL for links that leave the app (emails, OAuth callbacks).
 * Prefers the explicitly configured public URL, then Vercel's per-deployment
 * host, then localhost — so preview deployments produce working links without
 * extra configuration.
 */
export function appUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}${path}`;
}
