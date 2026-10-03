/**
 * Asking Mwata a question: the topics, the two ways out of the app (WhatsApp
 * and email) and the checks on what someone typed.
 *
 * The website promises "short questions by email or WhatsApp", so both are
 * here, with the step and the page already written into the message. Nobody
 * should have to explain where they were.
 *
 * Kept free of React and of the content files so it can be tested on its own.
 */

/** Where a question goes. The number is the one on the website. */
export const SUPPORT = {
  whatsapp: "31657930469",
  email: "info@maderealblueprint.com",
  /** Shown to people, not used for dialling. */
  whatsappReadable: "+31 6 5793 0469",
};

export type Topic = { id: string; label: string };

/** Fixed topics, plus one per step that is in the app. */
export function supportTopics(steps: { number: number; title: string }[]): Topic[] {
  return [
    { id: "general", label: "Something general" },
    ...steps.map((s) => ({ id: `step-${s.number}`, label: `Step ${s.number} ${s.title}` })),
    { id: "app", label: "The app itself — something is not working" },
    { id: "meetings", label: "Meetings and booking" },
    { id: "payment", label: "Payment" },
  ];
}

export const topicLabel = (topics: Topic[], id: string) =>
  topics.find((t) => t.id === id)?.label ?? id;

/** Only a step topic carries a page, so the "which page" box can hide itself. */
export const topicHasPage = (id: string) => id.startsWith("step-");

/** The link on an exercise page: the topic and the page are filled in already. */
export function helpHref(step: number, page: string) {
  const q = new URLSearchParams({ topic: `step-${step}`, page });
  return `/help?${q}`;
}

/**
 * The first line of a WhatsApp or email message. It names the page, because a
 * question without it costs two messages to understand.
 */
export function questionOpening(topic: string, page?: string) {
  return `Hi Mwata, a question about ${about(topic, page)}:`;
}

const about = (topic: string, page?: string) => (page ? `${topic}, ${page}` : topic);

/** An email has a subject line, so it carries the step and the page instead. */
export const mailSubject = (topic: string, page?: string) => `Question about ${about(topic, page)}`;

/** …and its body is a greeting and the question, not the subject again. */
export const mailBody = (question: string) => `Hi Mwata,\n\n${question.trim()}`;

export const whatsappHref = (text: string) =>
  `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(text)}`;

export const mailtoHref = (subject: string, body: string) =>
  `mailto:${SUPPORT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const MAX_QUESTION = 2000;

export type QuestionDraft = {
  topic: string;
  page?: string;
  question: string;
  replyBy: "email" | "whatsapp";
  whatsapp?: string;
};

/**
 * What is wrong with this question, in words a person can act on, or null when
 * it is ready to send. Used by the form and again on the server, because a
 * browser check is a convenience and never a guarantee.
 */
export function checkQuestion(d: QuestionDraft): string | null {
  const text = (d.question ?? "").trim();
  if (text.length < 5) return "Please write your question first.";
  if (text.length > MAX_QUESTION) {
    return `That is longer than ${MAX_QUESTION} characters. Please shorten it, or send it by email.`;
  }
  if (!d.topic) return "Please choose what your question is about.";
  if (d.replyBy === "whatsapp") {
    const digits = (d.whatsapp ?? "").replace(/\D/g, "");
    if (digits.length < 8) return "Please give the WhatsApp number to reply to, with the country code.";
  }
  return null;
}
