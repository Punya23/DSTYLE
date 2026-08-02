/**
 * Shipping terms, in one place. Checkout, the order API and the structured
 * data Google reads all have to agree on these numbers — a shipping cost in
 * the markup that doesn't match the cost at checkout is a Merchant Center
 * disapproval, not just a cosmetic mismatch.
 */
export const SHIPPING_FLAT = 299;
export const FREE_SHIPPING_THRESHOLD = 5000;

/** Business days between dispatch and delivery, quoted to Google as a range. */
export const HANDLING_DAYS = { min: 1, max: 3 };
export const TRANSIT_DAYS = { min: 3, max: 7 };

/** Where we ship. Two-letter ISO country code. */
export const SHIPPING_COUNTRY = "IN";
export const CURRENCY = "INR";
