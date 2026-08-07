/**
 * The merchant's real-world identity: who is selling, from where, and how a
 * customer reaches a human.
 *
 * Razorpay's merchant review checks that a live storefront publishes this
 * exact set of facts — legal entity, a postal address, a working phone and
 * email, and policy pages that match them. Keeping it in one module means the
 * policy pages, the contact page, the Organization JSON-LD and the transactional
 * email footer can never quote different numbers at each other.
 *
 * The placeholder values below are the ones that must be replaced with the
 * registered entity's details before the store takes real payments; they are
 * flagged in `.env.example` too.
 */

export const COMPANY = {
  /** Trading name shown to customers. */
  name: "Dstyle",
  /** Registered entity on the invoice and in the merchant agreement. */
  legalName: "Dstyle Couture",
  address: {
    line1: "Dstyle Atelier",
    line2: "Linking Road, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400050",
    country: "India",
    countryCode: "IN",
  },
  /** Customer-facing support inbox. Contact form deliveries land here. */
  supportEmail: "care@dstyle.in",
  /** Privacy/grievance contact — kept separate so it can be a named officer. */
  privacyEmail: "privacy@dstyle.in",
  /** E.164, so `tel:` links work from a phone. */
  phone: "+919876543210",
  phoneDisplay: "+91 98765 43210",
  /** IST. Quoted verbatim on the contact page and in auto-replies. */
  supportHours: "Monday to Saturday, 10:00 – 19:00 IST",
  /** Response commitment we are willing to publish. */
  responseWindow: "within one business day",
  instagram: "https://instagram.com/dipti__shahh",
  instagramHandle: "@dipti__shahh",
} as const;

/** One-line postal address, for JSON-LD and email signatures. */
export function formattedAddress(): string {
  const a = COMPANY.address;
  return [a.line1, a.line2, `${a.city} ${a.postalCode}`, a.state, a.country].join(", ");
}

/**
 * Commitments quoted in the policy pages. These mirror the constants the
 * checkout and returns flow actually enforce — see `@/lib/shipping` and
 * `RETURN_WINDOW_DAYS` in `@/lib/account`, which are imported rather than
 * restated wherever a number appears in policy copy.
 */
export const POLICY_TERMS = {
  /** Business days before a paid order leaves the atelier. */
  dispatchNote: "1 – 3 business days",
  /** Metro / non-metro transit, quoted as a range. */
  deliveryNote: "3 – 7 business days",
  /** Made-to-order pieces are cut after the order and take longer. */
  madeToOrderNote: "3 – 5 weeks",
  /** How long a refund takes to appear once we approve it. */
  refundWindow: "5 – 7 business days",
  /** Free-cancellation window, in hours after placing the order. */
  cancellationHours: 24,
} as const;
