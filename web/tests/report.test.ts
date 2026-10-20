import assert from "node:assert/strict";
import { test } from "node:test";
import step1 from "../src/content/step1-content.json" with { type: "json" };
import step2 from "../src/content/step2-content.json" with { type: "json" };
import step3 from "../src/content/step3-content.json" with { type: "json" };
import {
  CHECK_ONE_ROWS,
  CHECK_TWO_ROWS,
  DAILY_ROWS,
  DECIDES_ROWS,
  LIGHT_NAMES,
  WHEEL_AREAS,
  coverWords,
  decisionLine,
  durationIn,
  firstClause,
  inPlaceLine,
  lines,
  lightsOf,
  myTime,
  noStop,
  options,
  runway,
  savingsCascade,
  travelTime,
  wheel,
  type Answers,
} from "../src/lib/report.ts";

/* ────────────────── the row names this file counts on ─────────────────── */

type Field = { id: string; type?: string; row_labels?: string[] };
type Exercise = {
  id: string;
  /** A summary page carries its fields directly; an exercise keeps them in blocks. */
  fields?: Field[];
  start_here?: { fields?: Field[] };
  your_turn?: { fields?: Field[] };
  work?: { fields?: Field[] };
  blocks?: { fields?: Field[] }[];
};
type Content = { parts: { exercises?: Exercise[]; summary?: Exercise }[] };

function fieldOf(content: unknown, pageId: string, fieldId: string): Field {
  for (const part of (content as Content).parts) {
    for (const e of [...(part.exercises ?? []), ...(part.summary ? [part.summary] : [])]) {
      if (e.id !== pageId) continue;
      const blocks = [{ fields: e.fields }, e.start_here, e.your_turn, e.work, ...(e.blocks ?? [])];
      for (const b of blocks) {
        const found = b?.fields?.find((f) => f.id === fieldId);
        if (found) return found;
      }
    }
  }
  throw new Error(`no ${pageId}.${fieldId} in the content`);
}

/*
 * Every chart in a result document reads a table by row position. If a row
 * moves in the workbook, these fail — which is the point: the alternative is
 * a chart that quietly labels somebody's reserve as their moving costs.
 */
test("the eight life areas are the workbook's own, in its order", () => {
  assert.deepEqual(fieldOf(step1, "2.1", "wheel").row_labels, WHEEL_AREAS);
});

test("the week is sorted into the workbook's three kinds of time", () => {
  assert.deepEqual(fieldOf(step1, "2.1", "decides").row_labels, DECIDES_ROWS);
});

test("the savings cascade follows check one, line for line", () => {
  assert.deepEqual(fieldOf(step3, "s3-1.1", "check_one").row_labels, CHECK_ONE_ROWS);
});

test("the runway figures come from check two, line for line", () => {
  assert.deepEqual(fieldOf(step3, "s3-1.1", "check_two").row_labels, CHECK_TWO_ROWS);
});

test("the five lights are the five the workbook asks for", () => {
  assert.deepEqual(fieldOf(step3, "green_lights", "lights").row_labels, LIGHT_NAMES);
});

test("the short names for the daily checks point at the right questions", () => {
  const labels = fieldOf(step2, "s2-3.3", "daily").row_labels ?? [];
  DAILY_ROWS.forEach((r, i) => assert.equal(labels[i], r.label, `row ${i} is not "${r.label}"`));
});

/* ─────────────────────────── the cover line ───────────────────────────── */

test("the cover takes the person's first sentence and keeps the rest as the quote", () => {
  const c = coverWords("I want to wake with the light, and work three mornings a week. The rest can wait.");
  assert.equal(c.headline, "I want to wake with the light,");
  assert.equal(c.tail, "and work three mornings a week.");
  assert.equal(c.quote, "The rest can wait.");
});

test("a short sentence is not broken in two", () => {
  const c = coverWords("Go. With conditions.");
  assert.equal(c.headline, "Go.");
  assert.equal(c.tail, undefined);
  assert.equal(c.quote, "With conditions.");
});

test("nothing in, nothing out: the cover never writes a line of its own", () => {
  assert.deepEqual(coverWords("   "), { headline: "" });
});

/* ───────────────────────────── small readers ──────────────────────────── */

test("a paragraph becomes a list only when it really is one", () => {
  assert.deepEqual(lines("One thing.\nAnother thing."), ["One thing.", "Another thing."]);
  assert.deepEqual(lines("Whether the fibre holds. What heating costs."), [
    "Whether the fibre holds.",
    "What heating costs.",
  ]);
  assert.deepEqual(lines("A single thought, with a comma in it"), ["A single thought, with a comma in it"]);
});

test("two sentences can be joined without doubling the full stop", () => {
  assert.equal(noStop("Go."), "Go");
  assert.equal(firstClause("A rented house with land in the Serra, inland from Coimbra."), "A rented house with land in the Serra");
});

test("a length of time is only read back when the person named one", () => {
  assert.equal(durationIn("A twelve-month rental, not a purchase."), "1 year");
  assert.equal(durationIn("A trial year on the coast"), "1 year");
  assert.equal(durationIn("Six months to see"), "6 months");
  assert.equal(durationIn("We move for good"), null);
});

/* ───────────────────────────── the numbers ────────────────────────────── */

const ANNA: Answers = {
  "2.1": {
    wheel: { r0: { today: "5", year: "8" }, r5: { today: "4", year: "8" }, r7: { today: "3", year: "9" } },
    decides: { r0: { now: "52", want: "30" }, r1: { now: "28", want: "22" }, r2: { now: "32", want: "60" } },
  },
  "4.1": {
    options: {
      r0: { option: "Rent near Góis for a year", not_sure: "The winter" },
      r1: { option: "Buy and renovate", not_sure: "The cost" },
      r2: { option: "Stay, on four-day weeks", not_sure: "Whether it is enough" },
    },
  },
  "s3-1.1": {
    check_one: {
      r0: { amount: "42000" },
      r1: { amount: "600" },
      r2: { amount: "11000" },
      r3: { amount: "2300" },
      r4: { amount: "8000" },
      r5: { amount: "4000" },
      r6: { amount: "16100" },
    },
    check_two: { r3: { answer: "-710" }, r5: { answer: "18" }, r6: { answer: "Eleven months" } },
  },
  green_lights: {
    lights: {
      r0: { colour: "Amber", turns_green: "Two clients signed", by_when: "30 June 2027" },
      r1: { colour: "Green", turns_green: "Done" },
    },
  },
};

test("the week's share is counted against the workbook's 112 waking hours", () => {
  assert.deepEqual(myTime(ANNA), { now: 29, want: 54, nowHours: 32, wantHours: 60 });
});

test("the life areas come out biggest gap first, and only the ones scored", () => {
  const w = wheel(ANNA);
  assert.deepEqual(
    w.map((r) => r.label),
    ["Home and surroundings", "Fun and free time", "Health and energy"],
  );
  assert.deepEqual(w[0], { label: "Home and surroundings", from: 3, to: 9 });
});

test("the cascade takes each amount off the one before it, and ends where the person said", () => {
  const c = savingsCascade(ANNA);
  assert.ok(c);
  assert.deepEqual(
    c.steps.map((s) => [s.label, s.amount, s.kind]),
    [
      ["Savings available", 42000, "start"],
      ["Deciding costs", 600, "take"],
      ["Moving costs", 11000, "take"],
      ["Tied-up deposits", 2300, "take"],
      ["Emergency reserve", 8000, "keep"],
      ["Return fund", 4000, "keep"],
      ["For monthly shortfalls", 16100, "end"],
    ],
  );
  assert.equal(c.left, 16100);
});

test("the runway divides what is left to live on, not the savings", () => {
  // 16,100 ÷ 710 = 22 whole months. Dividing 42,000 would say 59.
  assert.equal(runway(ANNA).months, 22);
  assert.equal(runway(ANNA).wanted, "18");
});

test("a light nobody filled in says so, instead of showing green", () => {
  const l = lightsOf(ANNA);
  assert.equal(l[0].colour, "amber");
  assert.equal(l[1].colour, "green");
  assert.equal(l[4].colour, "unknown");
  assert.equal(l.length, 5);
});

test("an empty cascade is nothing to draw, not a chart of zeros", () => {
  assert.equal(savingsCascade({}), null);
});

test("the options are the ones with something written in them", () => {
  assert.deepEqual(
    options(ANNA, 2).map((o) => o.letter),
    ["A", "B"],
  );
  assert.equal(options(ANNA, 2)[0].doubt, "The winter");
});

/* ───────────────── a time phrase reading as a phrase ──────────────────── */

test("a period written where a date was asked for does not double the preposition", () => {
  assert.equal(inPlaceLine("In the fourth month"), "In place by the fourth month.");
  assert.equal(inPlaceLine("The fourth month"), "In place by the fourth month.");
  assert.equal(inPlaceLine("on the first Monday"), "In place by the first Monday.");
});

test("a phrase with its own preposition keeps it, and loses ours", () => {
  assert.equal(inPlaceLine("Within three months"), "In place within three months.");
  assert.equal(inPlaceLine("After the first month"), "In place after the first month.");
});

test("a date is left exactly as it was written, and a name keeps its capital", () => {
  assert.equal(inPlaceLine("14 March"), "In place by 14 March.");
  assert.equal(inPlaceLine("March 2027"), "In place by March 2027.");
  assert.equal(inPlaceLine("Easter"), "In place by Easter.");
  assert.equal(inPlaceLine(""), null);
  assert.equal(inPlaceLine(undefined), null);
});

/* ─────────────────── travel times, and what is not one ────────────────── */

test("minutes and kilometres are read as the journey they are", () => {
  assert.equal(travelTime("8 minutes by car, and I have driven it twice"), "8 min");
  assert.equal(travelTime("5 min on foot"), "5 min");
  assert.equal(travelTime("12 km, mostly motorway"), "12 km");
  assert.equal(travelTime("2 hours to Porto"), "2 h");
});

test("a working week is not a travel time, so the tile stays empty", () => {
  assert.equal(travelTime("My own job, 32 hours instead of 40"), null);
  assert.equal(travelTime("32 h"), null);
  assert.equal(travelTime("Four days a week, 30 hours"), null);
  assert.equal(travelTime("Not needed. I am not flying anywhere"), null);
});

test("a journey given in minutes wins over hours written in the same line", () => {
  assert.equal(travelTime("35 minutes each way, so 6 hours a week"), "35 min");
});

/*
 * Review round 7, R7-11: "1 h 10" printed as "1 h". The error was always in
 * the flattering direction, under a footnote saying these are the times as
 * recorded.
 */
test("the minutes after the hour are kept", () => {
  assert.equal(travelTime("1 h 10"), "1 h 10");
  assert.equal(travelTime("1 hour 40 by train"), "1 h 40");
  assert.equal(travelTime("about 1 hour and 20 on a good day"), "1 h 20");
  assert.equal(travelTime("1h10"), "1 h 10");
  assert.equal(travelTime("1.5 h"), "1 h 30");
  // And nothing is invented where there is nothing to read.
  assert.equal(travelTime("2 hours to Porto"), "2 h");
  assert.equal(travelTime("1 h 75"), "1 h");
  assert.equal(travelTime("1 h, then 2 km on foot"), "1 h");
});

/*
 * Sheet 1 of the Blueprint names the place and the decision. Somebody who is
 * staying has no new place, and the headline opened with the full stop that
 * would have followed one (Mwata, 20 October).
 */
test("the Blueprint's first headline reads as a sentence, with or without a place", () => {
  assert.equal(
    decisionLine("Around Góis, inland from Coimbra", "I will rent for a year"),
    "Around Góis, inland from Coimbra. I will rent for a year.",
  );
  assert.equal(decisionLine("", "I will change where I am"), "I will change where I am.");
  assert.equal(decisionLine("Around Góis", ""), "Around Góis.");
  assert.equal(decisionLine("", ""), "");
});
