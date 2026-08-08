import { COMPANY, POLICY_TERMS, formattedAddress } from "@/lib/company";
import { RETURN_WINDOW_DAYS } from "@/lib/account";
import {
  SHIPPING_FLAT,
  FREE_SHIPPING_THRESHOLD,
  HANDLING_DAYS,
  TRANSIT_DAYS,
} from "@/lib/shipping";
import { formatPrice } from "@/lib/utils";

/**
 * The store's published policies.
 *
 * Every number that also governs behaviour in code — shipping cost, free
 * shipping threshold, dispatch and transit windows, the returns window — is
 * interpolated from the constant the checkout and returns flow actually use.
 * A policy page that quotes a different figure from the one the cart charges
 * is the failure mode this module exists to prevent.
 *
 * These are working drafts written against Indian e-commerce practice (the
 * Consumer Protection (E-Commerce) Rules 2020, the DPDP Act 2023, and the
 * grievance-officer requirement under the IT Rules). They are not legal advice
 * — have counsel review the wording before the store takes real payments.
 */

export interface PolicySection {
  heading: string;
  /** Paragraphs, rendered in order. */
  body?: string[];
  /** Bulleted points, rendered after the paragraphs. */
  points?: string[];
}

export interface PolicyDoc {
  slug: string;
  /** `<h1>` and the metadata title. */
  title: string;
  /** Small caps line above the title. */
  eyebrow: string;
  /** Lede under the title; doubles as the meta description. */
  summary: string;
  /** ISO date. Shown as "Last updated" — regulators and customers both look. */
  updated: string;
  sections: PolicySection[];
}

const LAST_UPDATED = "2026-08-01";

const grievanceSection: PolicySection = {
  heading: "Grievance redressal",
  body: [
    `If something has gone wrong and ordinary support has not resolved it, write to our grievance officer at ${COMPANY.privacyEmail} or call ${COMPANY.phoneDisplay} during ${COMPANY.supportHours}. Include your order reference so we can pull the full history.`,
    `We acknowledge every grievance within 48 hours and aim to resolve it within 30 days, as required under the Consumer Protection (E-Commerce) Rules, 2020.`,
    `Postal address: ${formattedAddress()}.`,
  ],
};

const privacy: PolicyDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  eyebrow: "Legal",
  summary:
    "What personal data Dstyle collects, why we hold it, who we share it with, and the rights you have over it.",
  updated: LAST_UPDATED,
  sections: [
    {
      heading: "Who we are",
      body: [
        `${COMPANY.legalName} operates ${COMPANY.name} and is the data fiduciary for the personal data described here. You can reach us at ${COMPANY.privacyEmail}.`,
      ],
    },
    {
      heading: "What we collect",
      body: ["We collect only what an order, an account, or a support conversation needs:"],
      points: [
        "Account details — your name, email address, and phone number if you add one.",
        "Order details — shipping and billing addresses, the items you bought, and the status of each order.",
        "Payment signals — we never see or store your card, UPI or netbanking credentials. Razorpay processes the payment and returns only a payment reference and a success or failure result.",
        "Usage data — pages viewed, items recently viewed, and basic device information, used to keep the site fast and to spot abuse.",
        "Anything you send us — messages sent through the contact form, reviews you publish, and photographs attached to a return request.",
      ],
    },
    {
      heading: "Why we hold it",
      points: [
        "To take, fulfil and deliver your order, and to handle returns and refunds.",
        "To operate your account, including sign-in links and password resets.",
        "To send transactional email — order confirmations, dispatch notices, and return updates. These are not marketing and cannot be unsubscribed from while an order is live.",
        "To send marketing email, only if you subscribed. Every marketing email carries a one-click unsubscribe.",
        "To meet tax and accounting obligations, which require us to retain invoices.",
        "To detect fraud and abuse, including rate-limiting requests by IP address.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "We do not sell personal data. We share the minimum necessary with the processors that make the store work:",
      ],
      points: [
        "Razorpay — payment processing.",
        "Our logistics partners — name, address and phone number, so a courier can deliver.",
        "Resend — transactional and marketing email delivery.",
        "Neon and Upstash — database and cache hosting.",
        "Cloudinary — product and return-request imagery.",
        "Sentry and Vercel Analytics — error and performance monitoring, in aggregate.",
        "Law enforcement or a regulator, where we are legally compelled.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "Order and invoice records are retained for eight years, which is the period Indian tax law requires. Account data is kept until you ask us to delete the account. Marketing subscriptions are kept until you unsubscribe. Server logs are retained for 30 days.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        `Under the Digital Personal Data Protection Act, 2023 you can ask us for a copy of the personal data we hold about you, ask us to correct it, ask us to erase it, or withdraw a consent you previously gave. Write to ${COMPANY.privacyEmail} and we will respond ${COMPANY.responseWindow} and complete the request within 30 days.`,
        "Erasure has limits: we cannot delete an invoice we are legally required to retain, and we cannot delete data belonging to an order that is still in transit.",
      ],
    },
    {
      heading: "Security",
      body: [
        "Traffic is served over HTTPS only. Passwords are stored hashed, never in plain text. Access to production data is restricted to the people who operate the store. No system is perfect — if we ever discover a breach affecting your data, we will notify you and the Data Protection Board as the law requires.",
      ],
    },
    {
      heading: "Children",
      body: [
        "The store is not intended for anyone under 18. We do not knowingly collect data from children. If you believe a child has given us data, write to us and we will delete it.",
      ],
    },
    {
      heading: "Changes",
      body: [
        "When this policy changes materially we will update the date at the top of this page and, where the change affects how we use data you already gave us, tell you by email.",
      ],
    },
    grievanceSection,
  ],
};

const terms: PolicyDoc = {
  slug: "terms",
  title: "Terms of Service",
  eyebrow: "Legal",
  summary:
    "The terms on which Dstyle sells to you — orders, pricing, delivery, cancellation, and the limits of our liability.",
  updated: LAST_UPDATED,
  sections: [
    {
      heading: "Agreement",
      body: [
        `These terms govern your use of ${COMPANY.name}, operated by ${COMPANY.legalName}. By placing an order you accept them. If you do not, please do not use the store.`,
      ],
    },
    {
      heading: "Your account",
      body: [
        "You are responsible for what happens under your account and for keeping your sign-in email secure. Tell us immediately if you believe someone else has access. We may suspend an account we reasonably believe is being used fraudulently.",
      ],
    },
    {
      heading: "Products and availability",
      body: [
        "Every piece is photographed as faithfully as we can manage, but hand-dyed fabric and hand embroidery vary between pieces, and screen colour varies between devices. Small differences are a property of the craft, not a defect.",
        "Stock is shown live. An item can still sell out between the moment you add it to the cart and the moment you pay; if that happens we cancel that line and refund it in full.",
      ],
    },
    {
      heading: "Pricing and payment",
      body: [
        `All prices are in Indian Rupees and include GST where applicable. Shipping is ${formatPrice(SHIPPING_FLAT)}, free on orders of ${formatPrice(FREE_SHIPPING_THRESHOLD)} and above. The total you approve at checkout is the total you pay — we add nothing after the fact.`,
        "Payment is processed by Razorpay. We do not receive or store your payment credentials. An order is confirmed only once Razorpay reports the payment as captured.",
        "If a price is listed incorrectly through an obvious error, we will contact you before dispatch and either honour the correct price with your consent or cancel and refund the order in full.",
      ],
    },
    {
      heading: "Order acceptance",
      body: [
        "Your order is an offer to buy. Our confirmation email is our acceptance. We may decline an order — for suspected fraud, an undeliverable address, or stock that has genuinely run out — and where we do, any payment taken is refunded in full.",
      ],
    },
    {
      heading: "Cancellation",
      body: [
        `You may cancel a ready-to-ship order without charge within ${POLICY_TERMS.cancellationHours} hours of placing it, provided it has not been dispatched. Made-to-order and custom-cut pieces cannot be cancelled once cutting has begun, because the fabric has been committed to your measurements.`,
      ],
    },
    {
      heading: "Delivery, returns and refunds",
      body: [
        "Delivery is covered by our Shipping Policy and returns by our Returns & Refunds Policy. Both are part of these terms.",
      ],
    },
    {
      heading: "Reviews and submissions",
      body: [
        "You may only review a piece you actually bought. By posting a review you grant us a non-exclusive, royalty-free licence to display it on the store. We remove reviews that are abusive, contain personal data about someone else, or are not about the product.",
      ],
    },
    {
      heading: "Intellectual property",
      body: [
        `All designs, photography, copy and the ${COMPANY.name} name are owned by ${COMPANY.legalName}. You may not reproduce them commercially, or use them to train a machine-learning model, without written permission.`,
      ],
    },
    {
      heading: "Liability",
      body: [
        "We are liable for delivering the piece you paid for, in the condition described. To the extent the law allows, we are not liable for indirect or consequential loss, and our total liability for any order is limited to the amount you paid for it. Nothing here limits liability that cannot be limited under Indian law, including your statutory consumer rights.",
      ],
    },
    {
      heading: "Governing law",
      body: [
        `These terms are governed by the laws of India. Courts at ${COMPANY.address.city}, ${COMPANY.address.state} have exclusive jurisdiction.`,
      ],
    },
    grievanceSection,
  ],
};

const shipping: PolicyDoc = {
  slug: "shipping",
  title: "Shipping & Delivery",
  eyebrow: "Customer care",
  summary:
    "When your order leaves our atelier, how long it takes to reach you, what it costs, and how to track it.",
  updated: LAST_UPDATED,
  sections: [
    {
      heading: "Where we ship",
      body: [
        `We currently ship across India. For an international delivery, write to ${COMPANY.supportEmail} before ordering and we will quote a courier and a duty estimate for your country.`,
      ],
    },
    {
      heading: "What it costs",
      points: [
        `Flat rate — ${formatPrice(SHIPPING_FLAT)} anywhere in India.`,
        `Free — on every order of ${formatPrice(FREE_SHIPPING_THRESHOLD)} and above.`,
        "No hidden handling or packaging charge is added at any point.",
      ],
    },
    {
      heading: "How long it takes",
      body: [
        `Ready-to-ship pieces leave the atelier in ${HANDLING_DAYS.min} – ${HANDLING_DAYS.max} business days and reach you in a further ${TRANSIT_DAYS.min} – ${TRANSIT_DAYS.max} business days. Metro addresses sit at the fast end of that range.`,
        `Made-to-order and custom-cut pieces take ${POLICY_TERMS.madeToOrderNote} from confirmation, because the piece is cut and finished after you order. The product page says so before you add it to the cart.`,
        "Festive and bridal season can add a few days at the courier's end. We will tell you if your order is affected rather than let it go quiet.",
      ],
    },
    {
      heading: "Tracking",
      body: [
        "You get an email the moment your order is dispatched, carrying the courier name and tracking number. You can also follow an order at any time from the Track Order page using your order reference and the email you ordered with, or from Your Orders if you have an account.",
      ],
    },
    {
      heading: "Delivery attempts",
      body: [
        "Couriers make up to three attempts. Please make sure the phone number on the order is reachable — an unreachable number is the most common cause of a failed delivery. After three failed attempts the parcel returns to us and we refund the order minus the outbound shipping cost.",
      ],
    },
    {
      heading: "Damaged or missing parcels",
      body: [
        `If a parcel arrives damaged, photograph it before opening and write to ${COMPANY.supportEmail} within 48 hours. If tracking has not moved for seven days, tell us and we will open an investigation with the courier and keep you posted.`,
      ],
    },
    grievanceSection,
  ],
};

const returns: PolicyDoc = {
  slug: "returns",
  title: "Returns & Refunds",
  eyebrow: "Customer care",
  summary:
    "How to return or exchange a Dstyle piece, what qualifies, and how quickly a refund reaches you.",
  updated: LAST_UPDATED,
  sections: [
    {
      heading: "The window",
      body: [
        `You have ${RETURN_WINDOW_DAYS} days from delivery to raise a return. Start it from Your Orders — pick the pieces, tell us why, and we will arrange a pickup where the courier serves your pincode.`,
      ],
    },
    {
      heading: "What qualifies",
      points: [
        "The piece is unworn and unwashed, with every original tag still attached.",
        "The original packaging is intact.",
        "The piece is free of perfume, makeup, stains and alteration.",
      ],
    },
    {
      heading: "What cannot be returned",
      points: [
        "Made-to-order and custom-cut pieces, because they were cut to your measurements.",
        "Pieces bought in a final-sale event, which is marked on the product page before purchase.",
        "Blouses and any piece that has been altered or tailored after delivery.",
        "Jewellery and hair accessories, for hygiene reasons.",
      ],
      body: [
        "None of this applies if the piece arrived damaged, defective, or is not what you ordered — in that case we take it back whatever it is, and we cover the return shipping.",
      ],
    },
    {
      heading: "Exchanges",
      body: [
        "For a size exchange, raise a return and place a fresh order for the size you want. That way the size you need is held for you immediately rather than waiting for the first piece to travel back — couture stock is thin, and a held size is worth more than a saved step.",
      ],
    },
    {
      heading: "Refunds",
      body: [
        `Once the piece reaches us we inspect it within two business days. On approval the refund is issued to the original payment method and appears in ${POLICY_TERMS.refundWindow}, depending on your bank.`,
        "Shipping is refunded only where the return is our fault — a damaged, defective, or wrong item. On a change-of-mind return we refund the price of the goods.",
        "If a return arrives worn, altered, or without tags, we photograph it, tell you why it failed inspection, and ship it back to you at no charge. We do not quietly keep it.",
      ],
    },
    {
      heading: "Cancellations",
      body: [
        `A ready-to-ship order can be cancelled free of charge within ${POLICY_TERMS.cancellationHours} hours, as long as it has not been dispatched. After dispatch, treat it as a return.`,
      ],
    },
    grievanceSection,
  ],
};

const cookies: PolicyDoc = {
  slug: "cookies",
  title: "Cookie Policy",
  eyebrow: "Legal",
  summary:
    "The cookies and local storage Dstyle uses, what each one does, and how to turn off the optional ones.",
  updated: LAST_UPDATED,
  sections: [
    {
      heading: "What we use",
      body: [
        "We keep this deliberately small. There are no advertising cookies and no third-party trackers that follow you across other websites.",
      ],
    },
    {
      heading: "Strictly necessary",
      points: [
        "Session cookie — keeps you signed in. Without it there is no account.",
        "CSRF token — proves a form submission came from this site and not from an attacker's page.",
        "Cart storage — held in your browser so your bag survives a refresh.",
      ],
      body: [
        "These cannot be switched off without breaking checkout, which is why they do not require consent.",
      ],
    },
    {
      heading: "Analytics and performance",
      points: [
        "Vercel Analytics and Speed Insights — aggregate page views and loading performance. They do not use cookies and do not build a profile of you.",
        "Sentry — records an error when the site breaks, so we can fix it. It captures the page and the error, not your browsing.",
      ],
    },
    {
      heading: "Controlling cookies",
      body: [
        "Every browser lets you view and delete cookies and block them per site. Blocking the strictly necessary ones will stop sign-in and checkout from working. Clearing site data will empty your cart and sign you out.",
      ],
    },
    {
      heading: "Do Not Track",
      body: [
        "We honour the browser Do Not Track signal by not loading analytics when it is set.",
      ],
    },
    grievanceSection,
  ],
};

export const POLICIES: readonly PolicyDoc[] = [privacy, terms, shipping, returns, cookies];

export const POLICY_SLUGS = POLICIES.map((p) => p.slug);

export function getPolicy(slug: string): PolicyDoc | undefined {
  return POLICIES.find((p) => p.slug === slug);
}
