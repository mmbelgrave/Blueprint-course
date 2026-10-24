/**
 * The email that tells Mwata somebody asked a question.
 *
 * It goes out through Resend, from the same verified domain the sign-in codes
 * come from, with the person's own address as reply-to — so answering is just
 * pressing Reply. The question is stored either way: if this email cannot be
 * sent, the question is still in the database and on the Admin page.
 *
 * Server-only. The key never reaches the browser.
 */

export type QuestionMail = {
  name: string;
  email: string;
  topicLabel: string;
  page?: string;
  question: string;
  /**
   * Link to the Admin list, so progress is one click away. It used to point
   * at the person's own page, which was deleted on 20 October with the
   * consent that allowed reading anybody's answers (Mwata, 24 October).
   */
  adminUrl?: string;
};

const FROM = `The Life You Choose <${process.env.SUPPORT_EMAIL_FROM ?? "info@maderealblueprint.com"}>`;
const TO = process.env.SUPPORT_EMAIL_TO ?? "info@maderealblueprint.com";

/** Subject and body, kept pure so a test can read them. */
export function questionMail(q: QuestionMail) {
  const who = q.name || q.email;
  const about = q.page ? `${q.topicLabel}, ${q.page}` : q.topicLabel;
  const reply = [`Reply by email: ${q.email}`];

  const lines = [`${who} asked a question about ${about}.`, "", q.question.trim(), "", "---", ...reply];
  if (q.adminUrl) lines.push(`Progress and feedback: ${q.adminUrl}`);
  lines.push("", "Sent from the Blueprint app.");

  return { subject: `Question from ${who}: ${about}`, text: lines.join("\n") };
}

/**
 * Sends it. Returns false when there is no key or Resend refuses: the caller
 * carries on, because the question is already saved.
 */
export async function sendQuestionMail(q: QuestionMail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const { subject, text } = questionMail(q);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: q.email, subject, text }),
    });
    if (!res.ok) {
      console.error("Question email refused by Resend:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Question email could not be sent:", e);
    return false;
  }
}
