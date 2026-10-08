import assert from "node:assert/strict";
import { test } from "node:test";
import {
  headline,
  lights,
  moneyThread,
  stepsFinished,
  whatChanged,
  whatDoesNotLineUp,
  whatHappensNext,
  type Answers,
} from "../src/lib/blueprint.ts";

/** Somebody who has worked through all three steps, as Lotte and Ben did. */
const full: Answers = {
  "5.1": { life_picture: "A slower week by the sea.", directions: "The Silver Coast, renting first." },
  "3.2": { costs: { r0: { new_life: "1200" }, r1: { new_life: "800" } } },
  "3.4": { income: { r0: { new_life: "1600" } } },
  "s2-3.1": { costs: { r0: { guess: "2000", found: "1450" }, r1: { found: "1000" } } },
  "s2-5.1": {
    place: "São Martinho do Porto",
    where: "Leiria district",
    unknowns: "Whether the school has places for both children.",
    next_step: "Book the February visit",
    date: "Before 20 January",
  },
  "s3-0.1": { savings_reachable: "16350" },
  green_lights: {
    lights: {
      r0: { colour: "Amber", turns_green: "Lotte's income confirmed", by_when: "Before 1 March" },
      r1: { colour: "Green" },
      r2: { colour: "Amber", turns_green: "Care for Ben's mother arranged", by_when: "Before 15 March" },
      r3: { colour: "Green" },
      r4: { colour: "Amber", turns_green: "A tenant signed for our house", by_when: "" },
    },
  },
  "s3-4.1": {
    check: {
      r0: { item: "A school the children can walk to", meets: "Partly" },
      r1: { item: "Four hours from my parents", meets: "Yes" },
    },
  },
  "s3-4.2": {
    decision: "Go",
    conditions: "Lotte's income confirmed. A tenant signed.",
    first_step: "Meet two care providers",
    first_step_date: "Before 15 March",
    review_when: "1 April 2027",
    reasons: "Our ordinary days there look like our Life Picture.",
  },
};

test("a step counts as finished once its result page has been written in", () => {
  assert.deepEqual(stepsFinished(full), [
    { step: 1, finished: true },
    { step: 2, finished: true },
    { step: 3, finished: true },
  ]);
  assert.deepEqual(stepsFinished({}), [
    { step: 1, finished: false },
    { step: 2, finished: false },
    { step: 3, finished: false },
  ]);
});

test("the money thread puts three figures written weeks apart side by side", () => {
  const m = moneyThread(full);
  assert.equal(m.guessed, 2000, "Step 1 added up to 2000 a month");
  assert.equal(m.found, 2450, "Step 2 found 2450");
  assert.equal(m.differencePercent, 23);
  assert.equal(m.overTwentyPercent, true, "the workbook's own threshold");
  assert.equal(m.income, 1600);
  assert.equal(m.balance, -850, "measured against the checked figure, not the guess");
  assert.equal(m.savings, 16350);
  assert.equal(m.runwayMonths, 19);
});

test("the money thread says nothing it cannot know", () => {
  assert.deepEqual(moneyThread({}), {
    guessed: null,
    found: null,
    differencePercent: null,
    overTwentyPercent: false,
    income: null,
    balance: null,
    savings: null,
    runwayMonths: null,
  });
});

test("money left over leaves no runway to report", () => {
  const rich = { ...full, "3.4": { income: { r0: { new_life: "4000" } } } };
  const m = moneyThread(rich);
  assert.equal(m.balance, 1550);
  assert.equal(m.runwayMonths, null, "a runway only means something when you are short");
});

// Every flag must be a comparison between two things the person wrote, because
// this document is shown to other people and may never be wrong.
test("an amber light without a date is named; one with a date is not", () => {
  const found = whatDoesNotLineUp(full);
  const titles = found.map((f) => f.title);
  assert.ok(titles.includes("Plan B is amber, without a date"));
  assert.ok(!titles.some((t) => t.startsWith("Money is amber")), "Money has a date, so it is not flagged");
});

test("a red light and a broken must-have are both named", () => {
  const stuck: Answers = {
    ...full,
    green_lights: { lights: { r0: { colour: "Red", turns_green: "Nothing yet" } } },
    "s3-4.1": { check: { r0: { item: "Being four hours from my parents", meets: "No" } } },
  };
  const titles = whatDoesNotLineUp(stuck).map((f) => f.title);
  assert.ok(titles.includes("Money is a red light"));
  assert.ok(titles.includes("Something on your list this option does not meet"));
});

test("a list with nothing broken is reported as the good news it is", () => {
  const flags = whatDoesNotLineUp(full);
  const green = flags.find((f) => f.tone === "green");
  assert.equal(green?.title, "Nothing on your list is broken");
});

test("a go with no conditions is worth saying out loud", () => {
  const loose = { ...full, "s3-4.2": { ...full["s3-4.2"], conditions: "" } };
  assert.ok(whatDoesNotLineUp(loose).some((f) => f.title === "A go with no conditions written down"));
  assert.ok(!whatDoesNotLineUp(full).some((f) => f.title === "A go with no conditions written down"));
});

test("an empty blueprint flags nothing at all", () => {
  assert.deepEqual(whatDoesNotLineUp({}), [], "nothing written means nothing to compare");
});

test("what happens next gathers their own dates, and only dated things", () => {
  const next = whatHappensNext(full);
  assert.deepEqual(next[0], {
    when: "Before 15 March",
    what: "Meet two care providers",
    where: "your first step · Step 3 · 4.2",
  });
  assert.ok(next.some((n) => n.what === "Look at this decision again, whatever has happened"));
  assert.ok(
    !next.some((n) => n.what === "A tenant signed for our house"),
    "Plan B has no date, so it is not on the timeline — it is on the flags instead",
  );
});

test("the five lights keep their order and their names", () => {
  assert.deepEqual(
    lights(full).map((l) => `${l.name}:${l.colour}`),
    ["Money:Amber", "Papers:Green", "People:Amber", "Place:Green", "Plan B:Amber"],
  );
});

test("the headline falls back to the decision question from the Start", () => {
  const noQuestion: Answers = { "s3-0.1": { the_option: "Move to the Silver Coast" }, "s3-4.2": { decision: "Go" } };
  assert.equal(headline(noQuestion).question, "Move to the Silver Coast");
});

test("what changed is three of their own sentences, in order", () => {
  assert.deepEqual(
    whatChanged(full).map((c) => c.label),
    ["In Step 1 you wanted", "In Step 2 you chose", "In Step 3 you decided"],
  );
  assert.deepEqual(whatChanged({}), []);
});
