/**
 * Asking Mwata a question: the topics, the way out of the app (email) and the
 * checks on what someone typed.
 *
 * The step and the page are written into the message already, so nobody has to
 * explain where they were.
 *
 * Kept free of React and of the content files so it can be tested on its own.
 */

/**
 * Where a question goes. Email only, on purpose: answering someone's own plans
 * on WhatsApp reads as a service, and the shop does not allow services. Any
 * meetings are sold and booked outside the course area.
 */
export const SUPPORT = {
  email: "info@maderealblueprint.com",
};

export type Topic = { id: string; label: string };

/** Fixed topics, plus one per step that is in the app. */
export function supportTopics(steps: { number: number; title: string }[]): Topic[] {
  return [
    { id: "general", label: "Something general" },
    ...steps.map((s) => ({ id: `step-${s.number}`, label: `Step ${s.number} ${s.title}` })),
    { id: "app", label: "The app itself (something is not working)" },
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
 * The first line of the message. It names the page, because a question without
 * it costs two messages to understand.
 */
export function questionOpening(topic: string, page?: string) {
  return `Hi Mwata, a question about ${about(topic, page)}:`;
}

const about = (topic: string, page?: string) => (page ? `${topic}, ${page}` : topic);

/** An email has a subject line, so it carries the step and the page instead. */
export const mailSubject = (topic: string, page?: string) => `Question about ${about(topic, page)}`;

/** …and its body is a greeting and the question, not the subject again. */
export const mailBody = (question: string) => `Hi Mwata,\n\n${question.trim()}`;

export const mailtoHref = (subject: string, body: string) =>
  `mailto:${SUPPORT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const MAX_QUESTION = 2000;

export type QuestionDraft = {
  topic: string;
  page?: string;
  question: string;
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
  return null;
}
