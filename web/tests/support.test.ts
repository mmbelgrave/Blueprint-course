import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkQuestion,
  helpHref,
  mailBody,
  mailSubject,
  mailtoHref,
  questionOpening,
  supportTopics,
  topicHasPage,
  topicLabel,
  whatsappHref,
} from "../src/lib/support.ts";

const TOPICS = supportTopics([
  { number: 1, title: "Picture" },
  { number: 2, title: "Explore" },
]);

test("the steps in the app each get their own topic", () => {
  const ids = TOPICS.map((t) => t.id);
  assert.deepEqual(ids, ["general", "step-1", "step-2", "app", "meetings", "payment"]);
  assert.equal(topicLabel(TOPICS, "step-2"), "Step 2 Explore");
  // A step that is not in the app yet must not appear.
  assert.equal(ids.includes("step-3"), false);
});

test("only a step topic asks which page", () => {
  assert.equal(topicHasPage("step-1"), true);
  assert.equal(topicHasPage("general"), false);
  assert.equal(topicHasPage("app"), false);
});

// The point of the whole feature: Mwata should never have to ask "where were
// you?". The page travels with the question, through the link and the message.
test("the link from an exercise page carries the step and the page", () => {
  const href = helpHref(1, "1.2 My picture");
  assert.match(href, /^\/help\?/);
  const q = new URLSearchParams(href.split("?")[1]);
  assert.equal(q.get("topic"), "step-1");
  assert.equal(q.get("page"), "1.2 My picture");
});

test("the message says the step and the page", () => {
  assert.equal(
    questionOpening("Step 1 Picture", "1.2 My picture"),
    "Hi Mwata, a question about Step 1 Picture, 1.2 My picture:",
  );
  assert.equal(questionOpening("Something general"), "Hi Mwata, a question about Something general:");
});

test("spaces and accents survive the WhatsApp and email links", () => {
  const text = "Hi Mwata, a question about Step 1 Picture, 1.2 My picture:";
  assert.equal(whatsappHref(text), `https://wa.me/31657930469?text=${encodeURIComponent(text)}`);
  assert.ok(!whatsappHref(text).includes(" "), "a raw space would cut the message short");

  const link = mailtoHref("A question", "Line one\nLine two");
  assert.match(link, /^mailto:info@maderealblueprint\.com\?/);
  assert.match(link, /body=Line%20one%0ALine%20two/);
});

test("a question is checked before it is sent", () => {
  const ok = { topic: "general", question: "How do I book a meeting?", replyBy: "email" as const };
  assert.equal(checkQuestion(ok), null);

  assert.match(checkQuestion({ ...ok, question: "  " })!, /write your question/i);
  assert.match(checkQuestion({ ...ok, question: "hm" })!, /write your question/i);
  assert.match(checkQuestion({ ...ok, question: "x".repeat(2001) })!, /shorten/i);
  assert.match(checkQuestion({ ...ok, topic: "" })!, /what your question is about/i);
});

test("a WhatsApp reply needs a number to reply to", () => {
  const base = { topic: "general", question: "Can we talk this week?", replyBy: "whatsapp" as const };
  assert.match(checkQuestion(base)!, /WhatsApp number/i);
  assert.match(checkQuestion({ ...base, whatsapp: "06123" })!, /WhatsApp number/i);
  assert.equal(checkQuestion({ ...base, whatsapp: "+31 6 1234 5678" }), null);
});

// An email carries the step in its subject, so the body does not repeat it.
test("the email subject says what it is about, the body greets and asks", () => {
  assert.equal(mailSubject("Step 1 Picture", "1.2 My picture"), "Question about Step 1 Picture, 1.2 My picture");
  assert.equal(mailSubject("Payment"), "Question about Payment");
  assert.equal(mailBody("  Can I pay in two parts?  "), "Hi Mwata,\n\nCan I pay in two parts?");
});
