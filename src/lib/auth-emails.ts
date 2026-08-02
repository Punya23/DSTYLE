import { getResendClient, FROM_EMAIL } from "@/lib/resend";

/** Shared chrome for every transactional auth email. */
function shell(title: string, body: string) {
  return `
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:6px;text-transform:uppercase;">Dstyle</div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#b8935e;margin-top:6px;">Indian Couture</div>
    </div>
    <h1 style="font-family:Georgia,serif;font-style:italic;font-weight:300;font-size:24px;text-align:center;">${title}</h1>
    ${body}
  </div>`;
}

function ctaButton(url: string, label: string) {
  return `
    <div style="text-align:center;margin:32px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;background:#17130f;color:#fff;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${label}</a>
    </div>`;
}

const IGNORE_NOTE = `<p style="text-align:center;color:#999;font-size:12px;">Didn't request this? You can safely ignore this email.</p>`;

export function signInEmailHtml(url: string) {
  return shell(
    "Your sign-in link",
    `<p style="text-align:center;color:#666;font-size:14px;line-height:1.6;">
       Click below to sign in to Dstyle. This link expires in 24 hours and can only be used once.
     </p>
     ${ctaButton(url, "Sign In")}
     ${IGNORE_NOTE}`
  );
}

/**
 * Deliver a transactional auth email. Falls back to logging the link to the
 * server console in development when Resend isn't configured, so the whole
 * flow still works locally without a key. Throws in production — a silently
 * undelivered verification email is worse than a visible failure.
 */
async function send(to: string, subject: string, html: string, devLink: string) {
  const client = getResendClient();
  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `\n──────────── Dstyle dev: ${subject} ────────────\n  ${to}\n  ${devLink}\n────────────────────────────────────────────\n`
      );
      return;
    }
    throw new Error("Email isn't configured yet — add a real RESEND_API_KEY.");
  }
  const { error } = await client.emails.send({ from: FROM_EMAIL, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendVerificationEmail(to: string, url: string) {
  await send(
    to,
    "Verify your Dstyle account",
    shell(
      "Confirm your email",
      `<p style="text-align:center;color:#666;font-size:14px;line-height:1.6;">
         Welcome to Dstyle. Confirm this address to finish setting up your account —
         you'll then be able to sign in with your password. This link expires in 24 hours.
       </p>
       ${ctaButton(url, "Verify Email")}
       ${IGNORE_NOTE}`
    ),
    url
  );
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await send(
    to,
    "Reset your Dstyle password",
    shell(
      "Reset your password",
      `<p style="text-align:center;color:#666;font-size:14px;line-height:1.6;">
         Click below to choose a new password. This link expires in 1 hour and can only
         be used once. Your current password stays active until you set a new one.
       </p>
       ${ctaButton(url, "Reset Password")}
       ${IGNORE_NOTE}`
    ),
    url
  );
}

export async function sendPasswordChangedEmail(to: string) {
  await send(
    to,
    "Your Dstyle password was changed",
    shell(
      "Password updated",
      `<p style="text-align:center;color:#666;font-size:14px;line-height:1.6;">
         The password on your Dstyle account was just changed. If this wasn't you,
         reset your password immediately and contact us.
       </p>`
    ),
    "(no link — password-changed notice)"
  );
}
