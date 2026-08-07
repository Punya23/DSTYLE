import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

/**
 * IP-based rate limiting for the API surface.
 *
 * This is deliberately separate from the per-identifier throttles some routes
 * already do in Postgres (e.g. "3 OTPs per phone per 15 minutes"). Those stop a
 * single user hammering their own account; they do nothing against an attacker
 * rotating the identifier. `/api/otp/send` in particular spends real money per
 * request, so the ceiling has to be per-caller, not per-phone.
 *
 * Backed by Upstash when configured. Without it, a per-instance in-memory
 * counter is used — leaky across serverless instances, but strictly better than
 * no ceiling at all, and it keeps local dev honest.
 */

export type Budget = {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
};

export const BUDGETS = {
  /** Sends an SMS — the most expensive request in the app. */
  otpSend: { limit: 5, windowSec: 3600 },
  /** Register / forgot-password / reset / resend-verification. Sends email. */
  authWrite: { limit: 10, windowSec: 900 },
  /** OTP verification — tight, because it is a brute-force target. */
  otpVerify: { limit: 10, windowSec: 900 },
  /** Calls an LLM; each request costs tokens. */
  ai: { limit: 20, windowSec: 3600 },
  /** Order creation and payment verification. */
  payment: { limit: 20, windowSec: 600 },
  /** Admin media upload — large bodies, hits Cloudinary. */
  upload: { limit: 30, windowSec: 600 },
  /** General authenticated writes. */
  write: { limit: 60, windowSec: 60 },
  /** Public catalogue reads. */
  read: { limit: 120, windowSec: 60 },
} as const satisfies Record<string, Budget>;

export type BudgetName = keyof typeof BUDGETS;

/* -------------------------------------------------------------------------- */
/* Upstash-backed limiters                                                     */
/* -------------------------------------------------------------------------- */

const limiters = new Map<BudgetName, Ratelimit>();

function upstashLimiter(name: BudgetName): Ratelimit | null {
  const client = redis();
  if (!client) return null;

  let limiter = limiters.get(name);
  if (!limiter) {
    const { limit, windowSec } = BUDGETS[name];
    limiter = new Ratelimit({
      redis: client,
      // Sliding window avoids the burst-at-the-boundary hole a fixed window has.
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `dstyle:rl:${name}`,
      // Analytics writes an extra key per request; not worth the command spend.
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/* -------------------------------------------------------------------------- */
/* In-memory fallback                                                          */
/* -------------------------------------------------------------------------- */

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();
/** Hard cap so a flood of unique keys can't grow this without bound. */
const MEMORY_MAX_KEYS = 10_000;

function memoryLimit(key: string, budget: Budget) {
  const now = Date.now();
  const existing = memory.get(key);

  if (!existing || existing.resetAt <= now) {
    if (memory.size >= MEMORY_MAX_KEYS) {
      // Cheapest useful eviction: drop everything already expired, and if that
      // frees nothing, drop the oldest-resetting entry.
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
      if (memory.size >= MEMORY_MAX_KEYS) {
        const oldest = [...memory.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)[0];
        if (oldest) memory.delete(oldest[0]);
      }
    }
    const resetAt = now + budget.windowSec * 1000;
    memory.set(key, { count: 1, resetAt });
    return { success: true, remaining: budget.limit - 1, reset: resetAt };
  }

  existing.count += 1;
  return {
    success: existing.count <= budget.limit,
    remaining: Math.max(0, budget.limit - existing.count),
    reset: existing.resetAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Best-effort caller identity. Vercel always sets `x-forwarded-for`; the first
 * entry is the real client because the platform rewrites the header rather than
 * appending to a client-supplied one. Falls back to a constant so a missing
 * header degrades to a shared bucket rather than to no limit at all.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Epoch milliseconds at which the window resets. */
  reset: number;
}

/**
 * Consume one unit of `budget` for this caller.
 *
 * `scope` narrows the bucket beyond the IP — pass a user id or email so a
 * shared NAT doesn't lock out everyone behind it on per-account actions.
 */
export async function checkRateLimit(
  req: Request,
  name: BudgetName,
  scope?: string
): Promise<RateLimitResult> {
  const key = scope ? `${clientIp(req)}:${scope}` : clientIp(req);
  const limiter = upstashLimiter(name);

  if (!limiter) return memoryLimit(`${name}:${key}`, BUDGETS[name]);

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return { success, remaining, reset };
  } catch (err) {
    // Redis being unreachable must not take the whole API down with it. Fall
    // back to the in-memory ceiling rather than failing open.
    console.error(`[rate-limit] ${name} check failed, falling back to memory:`, err);
    return memoryLimit(`${name}:${key}`, BUDGETS[name]);
  }
}

/**
 * Guard a route handler. Returns a ready-to-return 429 when the caller is over
 * budget, or `null` when the request may proceed:
 *
 * ```ts
 * const limited = await enforceRateLimit(req, "otpSend");
 * if (limited) return limited;
 * ```
 */
export async function enforceRateLimit(
  req: Request,
  name: BudgetName,
  scope?: string,
  message = "Too many requests. Please wait a moment and try again."
): Promise<NextResponse | null> {
  const { success, remaining, reset } = await checkRateLimit(req, name, scope);
  if (success) return null;

  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "RateLimit-Limit": String(BUDGETS[name].limit),
        "RateLimit-Remaining": String(remaining),
        "RateLimit-Reset": String(Math.ceil(reset / 1000)),
      },
    }
  );
}
