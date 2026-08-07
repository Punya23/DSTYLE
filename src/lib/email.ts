import { getResendClient, FROM_EMAIL } from "@/lib/resend";
import { formatPrice } from "@/lib/utils";
import { COMPANY } from "@/lib/company";

/**
 * Escape a value before it goes into an HTML email body.
 *
 * Contact-form text is attacker-controlled and lands in the operator's inbox;
 * a mail client that renders the resulting HTML would otherwise happily render
 * whatever markup the sender typed.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Preserve the sender's line breaks without trusting their markup. */
function escapeHtmlMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

export interface OrderEmailItem {
  name: string;
  size: string;
  quantity: number;
  price: number;
}

export interface OrderEmailPayload {
  to: string;
  customerName: string;
  orderId: string;
  items: OrderEmailItem[];
  total: number;
}

/**
 * Send the order-confirmation email via Resend. Never throws — email failures
 * must not break the payment-confirmation path. No-ops if Resend isn't
 * configured (logs a warning) so local dev without a key still works.
 */
export async function sendOrderConfirmationEmail(payload: OrderEmailPayload): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email");
    return;
  }

  const rows = payload.items
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;font-family:Georgia,serif;color:#1a1a1a;">
          ${i.name}<br/>
          <span style="font-size:12px;color:#888;">Size ${i.size} · Qty ${i.quantity}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;color:#1a1a1a;">
          ${formatPrice(i.price * i.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:6px;text-transform:uppercase;">Dstyle</div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b8935e;margin-top:6px;">Indian Couture</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-style:italic;font-weight:300;font-size:26px;text-align:center;">Thank you, ${payload.customerName || "there"}.</h1>
    <p style="text-align:center;color:#666;font-size:14px;line-height:1.6;">
      Your order <strong>#${payload.orderId.slice(-8).toUpperCase()}</strong> is confirmed.
      Our atelier will begin preparing your pieces with care.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:28px 0;font-size:14px;">
      ${rows}
      <tr>
        <td style="padding:16px 0;font-weight:600;">Total</td>
        <td style="padding:16px 0;text-align:right;font-weight:600;">${formatPrice(payload.total)}</td>
      </tr>
    </table>
    <p style="text-align:center;color:#999;font-size:12px;">Worn for the moments that matter most.</p>
  </div>`;

  try {
    // Resend reports a rejected send in the response body, not by throwing —
    // without this check a bounced confirmation left no trace at all.
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.to,
      subject: `Your Dstyle order #${payload.orderId.slice(-8).toUpperCase()} is confirmed`,
      html,
    });
    if (error) console.error("[email] Resend rejected order confirmation:", error);
  } catch (err) {
    console.error("[email] Failed to send confirmation:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* Contact form                                                                */
/* -------------------------------------------------------------------------- */

export interface ContactEmailPayload {
  name: string;
  email: string;
  phone?: string;
  topic: string;
  orderRef?: string;
  message: string;
}

/** Where contact-form enquiries land. */
export const SUPPORT_INBOX =
  process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || COMPANY.supportEmail;

/**
 * Deliver a contact-form enquiry to the support inbox and acknowledge it to the
 * sender.
 *
 * Returns `false` when the notification could not be delivered, so the route can
 * tell the customer to email us directly rather than let a message vanish. The
 * acknowledgement is best-effort: a customer whose own mail server bounces our
 * receipt should not see the form fail after we already have their message.
 */
export async function sendContactEmails(payload: ContactEmailPayload): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    // Log the whole enquiry either way, so a misconfigured deployment still
    // leaves something to act on. In development that log *is* the delivery,
    // which keeps the form testable without a key — matching how the auth
    // emails behave. In production an undelivered enquiry is a real failure and
    // the customer has to be told.
    console.warn("[email] RESEND_API_KEY not set — contact enquiry not delivered:", payload);
    return process.env.NODE_ENV !== "production";
  }

  const rows: [string, string][] = [
    ["From", `${payload.name} <${payload.email}>`],
    ...(payload.phone ? ([["Phone", payload.phone]] as [string, string][]) : []),
    ["Topic", payload.topic],
    ...(payload.orderRef ? ([["Order", payload.orderRef]] as [string, string][]) : []),
  ];

  const detail = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 16px 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8c8378;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:6px 0;font-size:14px;color:#17130f;">${escapeHtml(value)}</td>
      </tr>`
    )
    .join("");

  const internalHtml = `
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Helvetica,Arial,sans-serif;color:#17130f;">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a97c48;">New enquiry</div>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:22px;margin:8px 0 24px;">${escapeHtml(payload.topic)}</h1>
    <table style="width:100%;border-collapse:collapse;">${detail}</table>
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5ded2;font-size:14px;line-height:1.7;color:#17130f;">
      ${escapeHtmlMultiline(payload.message)}
    </div>
  </div>`;

  const ackHtml = `
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:Helvetica,Arial,sans-serif;color:#17130f;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-family:Georgia,serif;font-size:26px;letter-spacing:6px;text-transform:uppercase;">Dstyle</div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a97c48;margin-top:6px;">Indian Couture</div>
    </div>
    <p style="font-size:14px;line-height:1.7;color:#4c443b;">Thank you, ${escapeHtml(payload.name)} — your message reached us.</p>
    <p style="font-size:14px;line-height:1.7;color:#4c443b;">
      Someone from the house will reply ${escapeHtml(COMPANY.responseWindow)}. We answer ${escapeHtml(COMPANY.supportHours)}.
    </p>
    <div style="margin:24px 0;padding:16px 18px;background:#f7f3ec;border-left:2px solid #a97c48;font-size:13px;line-height:1.7;color:#4c443b;">
      ${escapeHtmlMultiline(payload.message)}
    </div>
    <p style="font-size:12px;color:#8c8378;">
      Urgent? Call ${escapeHtml(COMPANY.phoneDisplay)}.
    </p>
  </div>`;

  try {
    // Resend reports delivery failures in the response rather than by throwing,
    // so the returned `error` has to be checked as well as the catch.
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_INBOX,
      // So hitting reply in the inbox writes back to the customer, not to us.
      replyTo: payload.email,
      subject: `[${payload.topic}] ${payload.name}${payload.orderRef ? ` · ${payload.orderRef}` : ""}`,
      html: internalHtml,
    });
    if (error) {
      console.error("[email] Resend rejected contact enquiry:", error, payload);
      return false;
    }
  } catch (err) {
    console.error("[email] Failed to deliver contact enquiry:", err, payload);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: payload.email,
      subject: "We have your message — Dstyle",
      html: ackHtml,
    });
    if (error) console.error("[email] Resend rejected contact acknowledgement:", error);
  } catch (err) {
    // The enquiry is already safely in the support inbox; a failed receipt is
    // not worth telling the customer their message did not go through.
    console.error("[email] Failed to send contact acknowledgement:", err);
  }

  return true;
}
