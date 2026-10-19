import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blueprintReport,
  exploreStaying,
  exploreStayingSheets,
  changePlanHeight,
  changePlanSheets,
  isStaying,
  lightsOf,
  looksLikeADate,
  savingsCascade,
  whenSuffix,
  type Answers,
  type ChangePlan,
} from "../src/lib/report.ts";

/*
 * Words the documents put around somebody's answers. Sample B found all four:
 * a staying document called its costs "Moving costs", said "The move is only
 * worth it", and wrote "before In the first week" where a date was expected.
 */

const moving: Answers = { "s3-4.2": { decision: "Go and move" } };
const staying: Answers = { "s3-4.2": { decision: "Go and change where I am" } };

test("the document knows which decision it is carrying", () => {
  assert.equal(isStaying(staying), true);
  assert.equal(isStaying(moving), false);
  assert.equal(isStaying({}), false);
});

test("the savings chart names the row after the decision", () => {
  const rows = {
    "s3-1.1": {
      check_one: { r0: { amount: "14000" }, r2: { amount: "690" }, r4: { amount: "6600" }, r6: { amount: "6710" } },
    },
  };
  const labels = (a: Answers) => savingsCascade(a)!.steps.map((s) => s.label);
  assert.ok(labels({ ...rows, ...moving }).includes("Moving costs"));
  assert.ok(labels({ ...rows, ...staying }).includes("The change itself"));
  assert.ok(!labels({ ...rows, ...staying }).includes("Moving costs"));
});

test("the blueprint says move or change, not always move", () => {
  assert.equal(blueprintReport(staying).staying, true);
  assert.equal(blueprintReport(moving).staying, false);
});

test("a date gets its preposition, a period gets its own sentence", () => {
  assert.equal(whenSuffix("14 March 2027", "before"), ", before 14 March 2027.");
  assert.equal(whenSuffix("March 2027", "before"), ", before March 2027.");
  assert.equal(whenSuffix("In the first week", "before"), ". In the first week.");
  assert.equal(whenSuffix("the third month after the change", "on"), ". the third month after the change.");
  assert.equal(whenSuffix("", "before"), ".");
  assert.equal(whenSuffix(undefined, "before"), ".");
  // And a full stop the person typed is not doubled.
  assert.equal(whenSuffix("In the first week.", "before"), ". In the first week.");
  assert.equal(looksLikeADate("2027-03-14"), true);
  assert.equal(looksLikeADate("in 8 weeks"), false);
});

/* R4-9: the five lights, read from the summary table or the pages behind it. */

const summary: Answers = {
  green_lights: {
    lights: {
      r0: { colour: "Amber", turns_green: "Two clients signed", by_when: "June" },
      r1: { colour: "Green", turns_green: "File ready", by_when: "Done" },
      r2: { colour: "Green", turns_green: "", by_when: "" },
      r3: { colour: "Red", turns_green: "", by_when: "" },
      r4: { colour: "Green", turns_green: "", by_when: "" },
    },
  },
};

const pages: Answers = {
  "s3-1.1": { money_light: "Amber", money_green_by: "After the first month" },
  "s3-1.2": { papers_light: "Green", papers_green_by: "Done", papers: "Nothing changes" },
  "s3-1.3": { people_light: "Green", people_green_by: "Done", people: "My sister knows" },
  "s3-1.4": { place_light: "Red", place_green_by: "", place: "Still looking" },
  "s3-1.5": { planb_light: "Green", planb_green_by: "Done", what_then: "Back to five days" },
};

test("the summary table is used where it was filled in", () => {
  const lights = lightsOf(summary);
  assert.deepEqual(lights.map((l) => l.colour), ["amber", "green", "green", "red", "green"]);
  assert.equal(lights[0].note, "Two clients signed");
});

test("a light set on its own page is not lost", () => {
  // The case R4-9 described: five pages answered, the summary table never
  // filled in. The document used to show five dashes.
  const lights = lightsOf(pages);
  assert.deepEqual(lights.map((l) => l.colour), ["amber", "green", "green", "red", "green"]);
  assert.deepEqual(lights.map((l) => l.name), ["Money", "Papers", "People", "Place", "Plan B"]);
  assert.equal(lights[1].note, "Nothing changes");
  assert.equal(lights[0].when, "After the first month");
});

test("the summary wins over the page, row by row", () => {
  const half: Answers = {
    ...pages,
    green_lights: { lights: { r3: { colour: "Green", turns_green: "The April visit settled it", by_when: "Done" } } },
  };
  const lights = lightsOf(half);
  // Place was red on its page and green in the summary: the summary is where
  // they looked at all five together.
  assert.equal(lights[3].colour, "green");
  assert.equal(lights[3].note, "The April visit settled it");
  // The other four still come from their pages.
  assert.equal(lights[0].colour, "amber");
  assert.equal(lights[4].colour, "green");
});

test("nothing answered anywhere is still unknown, not green", () => {
  assert.deepEqual(lightsOf({}).map((l) => l.colour), ["unknown", "unknown", "unknown", "unknown", "unknown"]);
});

/*
 * A full change plan does not fit on one A4 sheet. Printing Sample B showed
 * it spilling onto a second page with no running head and the footer in the
 * wrong place, so a long plan is now two proper sheets.
 */
const planOf = (over: Partial<ChangePlan>): ChangePlan =>
  ({
    written: true,
    change: "Four days a week in the same job, with Friday outdoors.",
    inPlace: "In the fourth month",
    firstThree: [],
    steps: [],
    incomeBuffer: "",
    whoITell: "",
    first90: "",
    planB: "",
    hours: "",
    checkIns: "",
    ...over,
  }) as ChangePlan;

test("a plan nobody wrote has no sheet at all", () => {
  assert.equal(changePlanSheets(planOf({ written: false })), 0);
});

test("a short plan is one sheet", () => {
  const short = planOf({
    steps: [
      { what: "Ask my manager", when: "First week" },
      { what: "Put it in writing", when: "Second month" },
    ],
    planB: "Keep the evenings and ask again in six months.",
  });
  assert.equal(changePlanSheets(short), 1);
  assert.ok(changePlanHeight(short) < 900);
});

test("a full plan is two, rather than spilling onto a ragged page", () => {
  // Sample B's own plan, word for word. On one sheet it measured 1400px
  // against A4's 1123, which is where this rule comes from.
  const full = planOf({
    change: "Four days a week in the same job, with Friday outdoors, and two evenings a week that end at six.",
    steps: Array.from({ length: 5 }, (_, i) => ({ what: `Step ${i + 1}`, when: "Soon", note: "Something first" })),
    incomeBuffer:
      "€2,360 a month from the fourth month, confirmed, against €2,210 of costs. The buffer stays at €6,600, three months of everything, untouched.",
    hours: "About 16 hours a week now. About 26 after the change.",
    whoITell:
      "My sister first, then my manager, then the team. From my sister I need a standing Friday, so somebody is expecting me.",
    first90:
      "Week one, the meeting. After 30 days, two evenings a week that really end at six. After 90 days, the request agreed and in writing.",
    planB:
      "If four days is refused, I keep the two evenings and ask again after six months, with one unpaid day a month meanwhile. If the lower pay does not add up, I go back to five days for a season rather than spend the reserve.",
  });
  assert.ok(changePlanHeight(full) > 900, `measured ${Math.round(changePlanHeight(full))}`);
  assert.equal(changePlanSheets(full), 2);
});

/*
 * Step 2's staying route, from workbook Rev.01c. A person who checks a change
 * where they live finishes with My Explore Summary (staying), and the Step 2
 * document has to show it. Before this, their document was the moving one,
 * which asks about a place they never chose.
 */
test("no staying summary, no extra sheets", () => {
  assert.equal(exploreStaying({}).written, false);
  assert.equal(exploreStayingSheets(exploreStaying({})), 0);
});

test("the staying summary is read from S7, and falls back to the pages behind it", () => {
  const a: Answers = {
    "s2-s1": { change: "Four days a week", gives: "Daylight after work", still_hard: "January" },
    "s2-s6": { confirmed: "I used the evenings" },
  };
  const plan = exploreStaying(a);
  assert.equal(plan.written, true);
  assert.equal(plan.change, "Four days a week");
  assert.equal(plan.test, "I used the evenings");
  assert.equal(exploreStayingSheets(plan), 2);
});

test("what S7 says wins over the pages behind it", () => {
  const a: Answers = {
    "s2-s1": { change: "A first thought" },
    "s2-s7": { change: "Four days a week, with Friday outdoors", choice: "Go further with this change" },
  };
  assert.equal(exploreStaying(a).change, "Four days a week, with Friday outdoors");
  assert.equal(exploreStaying(a).choice, "Go further with this change");
});
