import assert from "node:assert/strict";
import { test } from "node:test";
import { bothNames, hasSecondVoice, togetherReport, type Answers } from "../src/lib/report.ts";

/*
 * What a couple's document says (spec §6.8, slice 3).
 *
 * The shared half of a Blueprint is the same answers on both sides, so it
 * needs no test. This is the other half: the second voice only appears for
 * pages the comparison has already opened, and the line the two of them
 * agreed on is the one the plan rests on.
 */

const mine: Answers = {
  "1.4": {
    values: ["Freedom", "Nature", "Simplicity"],
    must_haves: { r0: { must_have: "Time outside every day" }, r1: { must_have: "A workshop" } },
    dealbreakers: "An hour from the shops",
  },
  "5.1": { choice: "A direction to investigate", agreed: "Four days a week, from March" },
  "s3-4.2": { decision: "Go, and move", because: "The money works", agreed: "Not yet. Go when the school visit is done." },
  "s2-4.3": { honest_answer: "I could live here." },
};

const theirs: Answers = {
  "1.4": {
    values: ["nature", "Health"],
    must_haves: { r0: { must_have: "Time outside every day." }, r1: { must_have: "A school we believe in" } },
    dealbreakers: "More than 40 minutes from a hospital",
  },
  "5.1": { choice: "Compare two or more" },
  "s3-4.2": { decision: "Not yet", because: "The school visit is not done" },
  "s2-4.3": { honest_answer: "I liked it, and I missed my sister." },
};

test("alone: no second voice anywhere, and the document keeps one name", () => {
  const two = togetherReport(mine, null);
  assert.equal(two.name, null);
  assert.equal(hasSecondVoice(two), false);
  assert.equal(two.values, null);
  assert.equal(two.decisions, null);
  assert.equal(bothNames("Mwata", null), "Mwata");
});

test("a pair: both names, and the parts that have two sides", () => {
  const two = togetherReport(mine, { name: "Renata", theirs });
  assert.equal(two.name, "Renata");
  assert.equal(hasSecondVoice(two), true);
  assert.equal(bothNames("Mwata", two.name), "Mwata and Renata");
});

test("the words they both chose, in the writer's own spelling", () => {
  const two = togetherReport(mine, { name: "Renata", theirs });
  assert.deepEqual(two.values?.both, ["Nature"]);
  assert.deepEqual(two.values?.onlyMine, ["Freedom", "Simplicity"]);
  assert.deepEqual(two.values?.onlyTheirs, ["Health"]);
});

test("a must-have only one of them wrote is kept, not quietly dropped", () => {
  const two = togetherReport(mine, { name: "Renata", theirs });
  assert.deepEqual(two.mustHaves?.both, ["Time outside every day"]);
  assert.deepEqual(two.mustHaves?.onlyMine, ["A workshop"]);
  assert.deepEqual(two.mustHaves?.onlyTheirs, ["A school we believe in"]);
});

test("two decisions, and the one they made together", () => {
  const two = togetherReport(mine, { name: "Renata", theirs });
  assert.equal(two.decisions?.mine.what, "Go, and move");
  assert.equal(two.decisions?.theirs.what, "Not yet");
  assert.equal(two.agreedDecision, "Not yet. Go when the school visit is done.");
  assert.equal(two.agreedDirection, "Four days a week, from March");
});

test("a page the other one has not finished has one voice, not an empty column", () => {
  // The route only hands over pages the comparison has opened, so a missing
  // page here is exactly what a half-finished one looks like.
  const half: Answers = { "1.4": theirs["1.4"] };
  const two = togetherReport(mine, { name: "Renata", theirs: half });
  assert.ok(two.values, "1.4 was shared, so it compares");
  assert.equal(two.decisions, null, "3.4.2 was not, so it does not");
  assert.equal(two.evening, null);
  // The agreed line is this person's own shared answer, so it still prints.
  assert.equal(two.agreedDecision, "Not yet. Go when the school visit is done.");
});

test("the agreed lines are the household's, not copied from either side", () => {
  // They live on the shared row, so they are already in this person's answers.
  const two = togetherReport(mine, { name: "Renata", theirs });
  assert.equal(two.agreedDirection, mine["5.1"].agreed);
  assert.equal(two.agreedDecision, mine["s3-4.2"].agreed);
});
