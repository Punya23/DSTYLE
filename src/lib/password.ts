import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

/**
 * scrypt parameters. N=2^15 costs ~50-80ms per hash on Vercel's Node runtime —
 * slow enough to make offline cracking expensive, fast enough for a sign-in
 * request. `maxmem` must be raised explicitly: Node's 32MB default is below
 * what these parameters need (128 * N * r ≈ 32MB) and scrypt would throw.
 */
const N = 32768;
const R = 8;
const P = 1;
const MAXMEM = 128 * N * R * 2;
const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Hash a plaintext password into a self-describing string:
 * `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>`. Embedding the parameters means
 * they can be raised later without invalidating existing hashes.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Constant-time verification against a stored hash. Returns false (never
 * throws) for malformed or unknown-format hashes, so a corrupt row can't turn
 * a failed sign-in into a 500.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltHex, hashHex] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    if (salt.length === 0 || expected.length === 0) return false;

    const derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * Number(n) * Number(r) * 2,
    });
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** SHA-256 hex digest — used to store password-reset tokens at rest. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** URL-safe random token for password-reset links. */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

// Re-exported so server code has a single import for everything password-
// related; the rules themselves live in a crypto-free module that client
// components can import too.
export { PASSWORD_MIN_LENGTH, validatePasswordStrength } from "@/lib/password-rules";
