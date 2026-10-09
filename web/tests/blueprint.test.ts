import assert from "node:assert/strict";
import { test } from "node:test";
import step3 from "../src/content/step3-content.json" with { type: "json" };
import {
  headline,
  lights,
  moneyThread,
  stepsFinished,
  whatChanged,
  whatDoesNotLineUp,
  whatHappensNext,
  whenKey,
  type Answers,
} from "../src/lib/blueprint.ts";

/** Somebody who has worked through all three steps, as Lotte and Ben did. */
const full: Answers = {
  "5.1": { life_picture: "A slower week by the sea.", directions: "The Silver Coast, renting first." },
  "3.2": { costs: { r0: { new_life: "1200" }, r1: { new_life: "800" } } },
  "3.4": { income: { r0: { new_life: "1600", certainty: "Confirmed" } } },
  "s2-3.1": { costs: { r0: { guess: "2000", found: "1450" }, r1: { found: "1000" } } },
  "s2-5.1": {
    place: "São Martinho do Porto",
    where: "Leiria district",
    unknowns: "Whether the school has places for both children.",
    next_step: "Book the February visit",
    date: "Before 20 January",
  },
  "s3-0.1": { savings_reachable: "16350" },
  // Check one walks down to what is left after the move; the runway divides
  // this, not the 16350 above it.
  "s3-1.1": { check_one: { r0: { amount: "16350" }, r6: { amount: "16350" } } },
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
  assert.equal(m.complete, true);
  assert.equal(m.differencePercent, 23);
  assert.equal(m.overTwentyPercent, true, "the workbook's own threshold");
  assert.equal(m.income, 1600);
  assert.equal(m.balance, -850, "measured against the checked figure, not the guess");
  assert.equal(m.savings, 16350);
  assert.equal(m.leftToLiveOn, 16350, "nothing taken off in this fixture");
  assert.equal(m.runwayMonths, 19);
});

test("the money thread says nothing it cannot know", () => {
  assert.deepEqual(moneyThread({}), {
    guessed: null,
    found: null,
    complete: true,
    differencePercent: null,
    overTwentyPercent: false,
    income: null,
    balance: null,
    savings: null,
    leftToLiveOn: null,
    runwayMonths: null,
    runwayWanted: null,
  });
});

test("money left over leaves no runway to report", () => {
  const rich = { ...full, "3.4": { income: { r0: { new_life: "4000", certainty: "Confirmed" } } } };
  const m = moneyThread(rich);
  assert.equal(m.balance, 2400 - 850 - 1550 + 1550, "income 4000 against costs 2450");
  assert.equal(m.runwayMonths, null, "a runway only means something when you are short");
});

/*
 * Round 4, finding 3. The Blueprint printed money that was wrong in two ways,
 * and this document goes to advisers with Mwata's name on it. Both rules are
 * the workbook's own, and both are easy to lose in a file that never sees the
 * content, so they are pinned here.
 */
test("hoped income is not income, so it cannot flip the month", () => {
  const hopeful: Answers = {
    ...full,
    "3.2": { costs: { r0: { new_life: "1400" } } },
    "3.4": {
      income: {
        r0: { new_life: "1000", certainty: "Confirmed" },
        r1: { new_life: "900", certainty: "Hoped" },
      },
    },
    "s2-3.1": { costs: { r0: { found: "1500" } } },
  };
  const m = moneyThread(hopeful);
  assert.equal(m.income, 1000, "the 900 they hope for is not counted");
  assert.equal(m.balance, -500, "short, not 400 left over");
  assert.ok((m.runwayMonths ?? 0) > 0, "and there is a runway to report");
});

test("an unknown in the costs means no figure is printed as a fact", () => {
  const unsure: Answers = {
    ...full,
    "3.2": { costs: { r0: { new_life: "900" }, r1: { new_life: "unknown" } } },
  };
  const m = moneyThread(unsure);
  assert.equal(m.complete, false, "the screen says 'not complete yet'; so must the document");
  assert.equal(m.differencePercent, null, "no percentage off a part-total");
  assert.equal(m.overTwentyPercent, false, "and no 'go back through both sets of figures'");
  assert.equal(m.balance, null);
  assert.equal(m.runwayMonths, null, "a runway from half a total is worse than none");
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

test("an unchecked list is not good news, it is an unchecked list", () => {
  // Round 4: the green line printed when the "does this option meet it?"
  // column had never been filled in. Written down is not the same as checked.
  const unchecked: Answers = { ...full, "s3-4.1": { check: { r0: { item: "A school nearby", meets: "" } } } };
  assert.ok(!whatDoesNotLineUp(unchecked).some((f) => f.tone === "green"));
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
  // "Before 15 March" names no year, so it cannot be placed on the timeline.
  // It is still shown, after everything that could be dated, rather than being
  // guessed at or dropped.
  assert.ok(
    next.some((n) => n.when === "Before 15 March" && n.what === "Meet two care providers"),
    "an undated step is still on the list",
  );
  const dated = next.map((n) => whenKey(n.when) !== null);
  assert.deepEqual(
    dated,
    [...dated].sort((a, b) => Number(b) - Number(a)),
    "everything with a date comes before everything without one",
  );
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

/* ── the timeline really is in order ── */

test("a date somebody typed themselves can be put in order", () => {
  assert.equal(whenKey("4 May 2027"), 20270504);
  assert.equal(whenKey("March 2027"), 20270301);
  assert.equal(whenKey("Done, 4 March 2027"), 20270304);
  assert.equal(whenKey("1 December 2027, after the first winter"), 20271201);
  assert.equal(whenKey("Mid-December 2027"), 20271201);
  assert.equal(whenKey("Done"), null);
  assert.equal(whenKey("after the summer"), null);
});

test("what happens next is earliest first, and what has no date stays at the end", () => {
  const answers = {
    "s3-4.2": {
      first_step_date: "4 May 2027",
      first_step: "Sign the rental",
      review_when: "1 December 2027",
    },
    green_lights: {
      lights: {
        r0: { colour: "Amber", turns_green: "Two clients signed", by_when: "30 June 2027" },
        r1: { colour: "Green", turns_green: "Papers ready", by_when: "Done, 4 March 2027" },
        r2: { colour: "Green", turns_green: "The flat is let", by_when: "Done" },
      },
    },
    "s3-3.1": {
      steps: { r0: { step: "Move the work online", when: "March 2027" } },
    },
  };
  const order = whatHappensNext(answers as never).map((n) => n.when);
  assert.deepEqual(order, ["March 2027", "Done, 4 March 2027", "4 May 2027", "30 June 2027", "1 December 2027", "Done"]);
});

/* ── the runway divides what is left, not what you started with ── */

test("the runway comes off what is left after the move is paid for", () => {
  // Round 5: the document divided the first line of Step 3's money column
  // instead of the last, so it promised a runway the size of the move itself.
  const answers = {
    "3.2": { costs: { r0: { new_life: "2000", certainty: "Known" } } },
    "s2-3.1": { costs: { r0: { found: "2000" } } },
    "3.4": { income: { r0: { new_life: "1500", certainty: "Confirmed" } } },
    "s3-0.1": { savings_reachable: "20000" },
    "s3-1.1": {
      check_one: {
        r0: { amount: "20000" },
        r2: { amount: "8000" },
        r4: { amount: "5000" },
        r6: { amount: "7000" },
      },
      check_two: { r5: { answer: "12" } },
    },
  };
  const m = moneyThread(answers as never);
  assert.equal(m.balance, -500, "short 500 a month");
  assert.equal(m.savings, 20000, "the gross figure is still reported");
  assert.equal(m.leftToLiveOn, 7000, "and so is what is left after the move");
  assert.equal(m.runwayMonths, 14, "7000 / 500, not 20000 / 500");
  assert.equal(m.runwayWanted, 12);
});

test("no runway at all when the bottom line is empty", () => {
  // Better to say nothing than to fall back on the figure before the move.
  const answers = {
    "3.2": { costs: { r0: { new_life: "2000", certainty: "Known" } } },
    "s2-3.1": { costs: { r0: { found: "2000" } } },
    "3.4": { income: { r0: { new_life: "1500", certainty: "Confirmed" } } },
    "s3-0.1": { savings_reachable: "20000" },
  };
  assert.equal(moneyThread(answers as never).runwayMonths, null);
});

test("a runway shorter than the one they asked for is named", () => {
  const answers = {
    "3.2": { costs: { r0: { new_life: "2000", certainty: "Known" } } },
    "s2-3.1": { costs: { r0: { found: "2000" } } },
    "3.4": { income: { r0: { new_life: "1500", certainty: "Confirmed" } } },
    "s3-1.1": { check_one: { r6: { amount: "3000" } }, check_two: { r5: { answer: "12" } } },
  };
  const flags = whatDoesNotLineUp(answers as never);
  const f = flags.find((x) => x.title === "Your runway is shorter than the one you wanted");
  assert.ok(f, "6 months against the 12 they wanted");
  assert.match(f.quote, /wanted 12 months/);

  const enough = { ...answers, "s3-1.1": { check_one: { r6: { amount: "30000" } }, check_two: { r5: { answer: "12" } } } };
  assert.ok(
    !whatDoesNotLineUp(enough as never).some((x) => x.title === "Your runway is shorter than the one you wanted"),
    "60 months against 12 is not a problem",
  );
});

test("the rows the runway reads are the rows the workbook writes", () => {
  // blueprint.ts has to address these by position. If a row moves in the
  // content, this fails rather than the runway quietly changing.
  const one = step3.parts
    .flatMap((p) => p.exercises)
    .find((e) => e.id === "s3-1.1").start_here.fields;
  const checkOne = one.find((f) => f.id === "check_one");
  const checkTwo = one.find((f) => f.id === "check_two");
  assert.equal(checkOne.row_labels[6], "Savings left to live on");
  assert.equal(checkTwo.row_labels[5], "The runway I want, in months (my choice)");
});
