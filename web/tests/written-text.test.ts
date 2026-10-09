import assert from "node:assert/strict";
import { test } from "node:test";
import { fileName, writtenText } from "../src/lib/written-text.ts";

const SECTIONS = [
  {
    title: "Step 1 · Picture — Part 5 · My Working Direction",
    pages: [
      {
        title: "5.1 My working direction",
        lines: [
          { label: "The life I am aiming at", text: "A smallholding near Tavira." },
          { label: "Two directions", text: "Keep the business\nSell the business" },
        ],
      },
      { title: "5.2 Nothing here yet", lines: [] },
    ],
  },
];

test("the document names itself, the person and the day", () => {
  const out = writtenText({ title: "My Working Direction", who: "Kees", when: "9 October 2026", sections: SECTIONS });
  assert.match(out, /^My Working Direction\n={20}\nKees · 9 October 2026/);
});

test("a heading is underlined to the width of the heading", () => {
  const out = writtenText({ title: "Ten chars", when: "today", sections: [] });
  assert.ok(out.includes("Ten chars\n========="));
});

test("an answer sits under its question, and every line of it is indented", () => {
  const out = writtenText({ title: "x", when: "today", sections: SECTIONS });
  assert.ok(out.includes("  The life I am aiming at\n    A smallholding near Tavira."));
  assert.ok(out.includes("    Keep the business\n    Sell the business"));
});

test("a page nobody wrote on is left out, rather than printed empty", () => {
  const out = writtenText({ title: "x", when: "today", sections: SECTIONS });
  assert.ok(!out.includes("5.2 Nothing here yet"));
});

test("a document with nothing in it says so instead of looking broken", () => {
  const out = writtenText({ title: "x", when: "today", sections: [{ title: "Step 1", pages: [] }] });
  assert.ok(out.includes("You have not written anything yet."));
  assert.ok(!out.includes("Step 1"));
});

test("the file is named after the document and the day it was made", () => {
  assert.equal(fileName("My Working Direction", new Date("2026-10-09T10:00:00Z")), "my-working-direction-2026-10-09.txt");
  assert.equal(fileName("My Blueprint · Phase 1 · Choose it", new Date("2026-10-09T10:00:00Z")), "my-blueprint-phase-1-choose-it-2026-10-09.txt");
});
