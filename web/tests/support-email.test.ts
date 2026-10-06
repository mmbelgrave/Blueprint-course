import assert from "node:assert/strict";
import { test } from "node:test";
import { questionMail } from "../src/lib/support-email.ts";

const base = {
  name: "Anna",
  email: "anna@example.com",
  topicLabel: "Step 1 Picture",
  page: "1.2 A normal day in your new life",
  question: "  Can I answer in Dutch?  ",
  adminUrl: "https://app.maderealblueprint.com/admin/abc",
};

test("the subject says who asked and about what", () => {
  const { subject } = questionMail(base);
  assert.equal(subject, "Question from Anna — Step 1 Picture, 1.2 A normal day in your new life");
  // Without a name, the address has to stand in for it.
  assert.match(questionMail({ ...base, name: "" }).subject, /^Question from anna@example\.com/);
});

test("the body holds the question, the way back and nothing else", () => {
  const { text } = questionMail(base);
  assert.match(text, /^Anna asked a question about Step 1 Picture, 1\.2 A normal day/);
  assert.match(text, /\n\nCan I answer in Dutch\?\n\n/, "the question stands on its own, trimmed");
  assert.match(text, /Reply by email: anna@example\.com/);
  assert.match(text, /Their progress: https:\/\/app\.maderealblueprint\.com\/admin\/abc/);
});

test("no page and no admin link still reads properly", () => {
  const { subject, text } = questionMail({ ...base, page: undefined, adminUrl: undefined });
  assert.equal(subject, "Question from Anna — Step 1 Picture");
  assert.ok(!text.includes("Their progress"));
  assert.ok(!text.includes("undefined"));
});
