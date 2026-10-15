/**
 * One plain-text email through Resend.
 *
 * Returns false rather than throwing: a letter that cannot be sent must never
 * take the request down with it. The caller decides what that means, because it
 * differs: a welcome email that fails is logged, while the quiet-account notice
 * must not start a 30-day clock on a letter nobody received.
 *
 * The four older routes each have their own copy of this; they can move over
 * one at a time.
 */
export const MAIL_FROM = `The Made Real Blueprint <${process.env.SUPPORT_EMAIL_FROM ?? "info@maderealblueprint.com"}>`;

export async function sendMail(
  to: string,
  mail: { subject: string; text: string; replyTo?: string },
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [to],
        subject: mail.subject,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.error("email refused by Resend:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("email could not be sent:", e);
    return false;
  }
}
