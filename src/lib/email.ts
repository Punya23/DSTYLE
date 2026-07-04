import { Resend } from "resend";
import { formatPrice } from "@/lib/utils";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.FROM_EMAIL || "Dstyle <orders@dstyle.in>";

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
    await resend.emails.send({
      from: FROM,
      to: payload.to,
      subject: `Your Dstyle order #${payload.orderId.slice(-8).toUpperCase()} is confirmed`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send confirmation:", err);
  }
}
