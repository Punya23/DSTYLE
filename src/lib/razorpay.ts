import Razorpay from "razorpay";
import crypto from "crypto";

// Lazily instantiated so the constructor doesn't run at build time (when env
// vars are absent), only at request time in the runtime environment.
let _razorpay: Razorpay | null = null;

/**
 * A value that is present but is still the scaffold text from `.env.example`.
 *
 * Razorpay's constructor accepts any non-empty strings, so placeholders used to
 * sail through the emptiness check below and only failed later, as a 401 inside
 * `orders.create()` — which the checkout route catches and reports to the
 * shopper as a generic "Could not place your order". Every other integration in
 * this app (Cloudinary, Resend, Redis) already rejects placeholders explicitly;
 * payments, of all things, should not be the exception.
 */
function isPlaceholder(value: string): boolean {
  return /placeholder|your[-_]|xxx|change[-_ ]?me|example/i.test(value);
}

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    if (isPlaceholder(process.env.RAZORPAY_KEY_ID) || isPlaceholder(process.env.RAZORPAY_KEY_SECRET)) {
      throw new Error(
        "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are still the scaffold placeholders — " +
          "set the live keys from the Razorpay dashboard before taking payments."
      );
    }
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

/** @deprecated Use getRazorpay() instead */
export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop) {
    return (getRazorpay() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Verify the signature returned by the Razorpay Checkout `handler` on the
 * client. Razorpay signs `${order_id}|${payment_id}` with the API key secret.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

/**
 * Verify a Razorpay webhook. Webhooks sign the RAW request body with the
 * webhook secret configured in the Razorpay dashboard, delivered in the
 * `x-razorpay-signature` header.
 *
 * There is deliberately no fallback to the API key secret. Razorpay's webhook
 * secret is a separate value you type into the dashboard when creating the
 * webhook, and it is never equal to the key secret — so the old fallback did
 * not "degrade gracefully", it silently rejected every genuine webhook while
 * looking configured. The failure mode that produces is the expensive one:
 * payments that succeed at the gateway but leave the order PENDING forever,
 * with no error anywhere except a 400 in Razorpay's own delivery log.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || isPlaceholder(secret)) {
    console.error(
      "[razorpay] RAZORPAY_WEBHOOK_SECRET is not set — every webhook will be rejected. " +
        "Copy the secret from the Razorpay dashboard webhook configuration."
    );
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

/** Constant-time comparison that never throws on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Backwards-compatible alias (previous name).
export const verifyRazorpaySignature = verifyPaymentSignature;
