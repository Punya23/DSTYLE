import { COMPANY, POLICY_TERMS } from "@/lib/company";
import { RETURN_WINDOW_DAYS } from "@/lib/account";
import {
  SHIPPING_FLAT,
  FREE_SHIPPING_THRESHOLD,
  HANDLING_DAYS,
  TRANSIT_DAYS,
} from "@/lib/shipping";
import { formatPrice } from "@/lib/utils";

/**
 * Customer FAQs, grouped for the page and flattened for FAQPage JSON-LD.
 *
 * Answers are plain text on purpose: Google's FAQ rich result rejects markup,
 * and the same strings feed both the page and the structured data, so the two
 * cannot drift. Numbers come from the shipping and returns constants for the
 * same reason the policy pages interpolate them.
 */

export interface Faq {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: Faq[];
}

export const FAQ_GROUPS: readonly FaqGroup[] = [
  {
    title: "Orders",
    items: [
      {
        question: "How do I know my order went through?",
        answer:
          "A confirmation email reaches you within a few minutes of payment, carrying your order reference. If it has not arrived, check your spam folder first, then open Track Order and enter the email you used — if the order exists, it will show there.",
      },
      {
        question: "Can I change my order after placing it?",
        answer: `Write to ${COMPANY.supportEmail} as soon as possible. We can usually change a size or an address while the order is still in the atelier. Once it is dispatched, the change has to go through a return.`,
      },
      {
        question: "Can I cancel an order?",
        answer: `Yes — a ready-to-ship order can be cancelled free of charge within ${POLICY_TERMS.cancellationHours} hours, as long as it has not been dispatched. Made-to-order pieces cannot be cancelled once cutting has begun, because the fabric is already committed to your measurements.`,
      },
      {
        question: "Do you take orders over WhatsApp or Instagram?",
        answer: `We answer questions there, but every order is placed on the website so it carries an invoice, a tracking link and a returns window. If you need help completing an order, call ${COMPANY.phoneDisplay} and we will walk you through it.`,
      },
    ],
  },
  {
    title: "Shipping",
    items: [
      {
        question: "What does shipping cost?",
        answer: `A flat ${formatPrice(SHIPPING_FLAT)} anywhere in India, and free on orders of ${formatPrice(FREE_SHIPPING_THRESHOLD)} and above. Nothing is added after checkout.`,
      },
      {
        question: "How long will my order take?",
        answer: `Ready-to-ship pieces leave the atelier in ${HANDLING_DAYS.min} to ${HANDLING_DAYS.max} business days and reach you in a further ${TRANSIT_DAYS.min} to ${TRANSIT_DAYS.max}. Made-to-order and custom-cut pieces take ${POLICY_TERMS.madeToOrderNote} from confirmation.`,
      },
      {
        question: "Do you ship internationally?",
        answer: `Not through the website yet. Write to ${COMPANY.supportEmail} with the piece and your country and we will quote a courier and an estimate of duties before you commit.`,
      },
      {
        question: "How do I track my order?",
        answer:
          "Your dispatch email carries the courier and tracking number. You can also open Track Order at any time and enter your order reference with the email you ordered with — no account needed.",
      },
    ],
  },
  {
    title: "Returns",
    items: [
      {
        question: "What is your returns window?",
        answer: `${RETURN_WINDOW_DAYS} days from delivery. Start the return from Your Orders — choose the pieces, tell us why, and we arrange a pickup where the courier serves your pincode.`,
      },
      {
        question: "Which pieces cannot be returned?",
        answer:
          "Made-to-order and custom-cut pieces, final-sale pieces, blouses, anything altered after delivery, and jewellery or hair accessories. None of that applies if the piece arrived damaged, defective or wrong — then we take it back whatever it is, and cover the return shipping.",
      },
      {
        question: "How do I exchange for a different size?",
        answer:
          "Raise a return on the piece you have and place a fresh order for the size you want. Couture stock is thin, so this holds your size immediately instead of waiting for the first piece to travel back.",
      },
      {
        question: "When does my refund arrive?",
        answer: `We inspect a returned piece within two business days of receiving it. Once approved, the refund goes back to the original payment method and appears in ${POLICY_TERMS.refundWindow}, depending on your bank.`,
      },
    ],
  },
  {
    title: "Sizing & fit",
    items: [
      {
        question: "How do I find my size?",
        answer:
          "Use the size guide on any product page. The figures there are body measurements in inches, not garment measurements — ease is cut into each piece differently, so the finished garment measures larger.",
      },
      {
        question: "I am between two sizes. What should I do?",
        answer: `For fitted silhouettes take the larger size; for flowing pieces the smaller usually sits better. If you are unsure, send your bust, waist and hip measurements to ${COMPANY.supportEmail} with the piece you are considering and we will tell you which we would cut for you.`,
      },
      {
        question: "Can I have a piece made to my measurements?",
        answer:
          "Yes. Most pieces can be cut to measure. Write to us with the piece and your measurements, and we will confirm the price and the timeline before taking anything.",
      },
    ],
  },
  {
    title: "Care & craft",
    items: [
      {
        question: "How should I care for a Dstyle piece?",
        answer:
          "Dry clean only, and tell the cleaner it is hand embroidered. Store folded in the muslin bag it arrived in rather than on a hanger — the weight of embroidery pulls a shoulder seam out of shape over time. Keep it out of direct sunlight.",
      },
      {
        question: "Why does my piece look slightly different from the photograph?",
        answer:
          "Fabric is hand dyed and embroidery is worked by hand, so no two pieces are identical, and screen colour varies between devices. Small variation is a property of the craft. If a piece is genuinely not what you ordered, it is a return and we cover it.",
      },
      {
        question: "Where is Dstyle made?",
        answer: `Every piece is made in our ${COMPANY.address.city} atelier, in small batches, by artisans trained in traditional Indian embroidery and weaving.`,
      },
    ],
  },
  {
    title: "Payments & account",
    items: [
      {
        question: "Which payment methods do you accept?",
        answer:
          "UPI, credit and debit cards, netbanking and the major wallets, all processed by Razorpay. We never see or store your payment credentials.",
      },
      {
        question: "Are prices inclusive of GST?",
        answer:
          "Yes. Every price shown includes GST where it applies, and your invoice breaks it out line by line. You can download the invoice from Your Orders once the order ships.",
      },
      {
        question: "Do I need an account to order?",
        answer:
          "No. You can check out as a guest and track the order with your reference and email. An account simply keeps your addresses, orders, invoices and wishlist in one place.",
      },
      {
        question: "How do I delete my account?",
        answer: `Write to ${COMPANY.privacyEmail} from the address on the account. We will confirm and complete the deletion within 30 days, keeping only the invoices Indian tax law requires us to retain.`,
      },
    ],
  },
] as const;

/** Flat list, in page order — used for the FAQPage structured data. */
export const ALL_FAQS: readonly Faq[] = FAQ_GROUPS.flatMap((g) => g.items);
