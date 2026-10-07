import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lessonsOfStep,
  lessonTime,
  moduleState,
  progressOfLessons,
  progressOfPhase,
  watchedKey,
  type ModuleDef,
} from "../src/lib/modules.ts";

const phase1: ModuleDef = { id: "phase-1", kind: "phase", name: "Phase 1", steps: [1, 2, 3] };
const phase2: ModuleDef = { id: "phase-2", kind: "phase", name: "Phase 2", steps: [4, 5, 6, 7] };
const free: ModuleDef = { id: "free", kind: "free", name: "Free material", items: [] };
const intro: ModuleDef = { id: "introduction", kind: "lesson", name: "Introduction" };

const parts = [
  { id: "p0", number: 0, label: "Start", title: "Your First Picture", time: "20–30 min", firstPage: "0.1" },
  {
    id: "p1",
    number: 1,
    label: "Part 1",
    title: "Picture your new life",
    time: "75–100 min",
    video: { title: "Part 1", length: "12–16 min", url: null },
    firstPage: "1.0",
  },
  { id: "p2", number: 2, label: "Part 2", title: "Look honestly at today", time: "60–75 min", firstPage: "2.1" },
];

test("a step's lessons are named once, in the step's own content", () => {
  const lessons = lessonsOfStep(1, parts);
  assert.deepEqual(lessons.map((l) => l.title), [
    "Start · Your First Picture",
    "Part 1 · Picture your new life",
    "Part 2 · Look honestly at today",
  ]);
  assert.equal(lessons[1].exerciseHref, "/step/1/p1/1.0");
});

test("watching is counted per lesson, under a key that cannot collide", () => {
  const lessons = lessonsOfStep(1, parts);
  assert.deepEqual(progressOfLessons("phase-1", "step-1", lessons, {}), {
    done: 0,
    total: 3,
    percent: 0,
    complete: false,
  });
  const one = { [watchedKey("phase-1", "step-1", "p1")]: true };
  assert.deepEqual(progressOfLessons("phase-1", "step-1", lessons, one), {
    done: 1,
    total: 3,
    percent: 33,
    complete: false,
  });
  assert.equal(watchedKey("phase-1", "step-1", "p1"), "module:phase-1:step-1:p1");
});

test("a phase adds up its steps", () => {
  assert.deepEqual(progressOfPhase([{ done: 2, total: 6 }, { done: 0, total: 5 }]), {
    done: 2,
    total: 11,
    percent: 18,
    complete: false,
  });
  assert.deepEqual(progressOfPhase([]), { done: 0, total: 0, percent: 0, complete: false }, "never divides by zero");
  assert.equal(progressOfPhase([{ done: 3, total: 3 }]).complete, true);
});

// What someone sees on a phase they have not bought is an offer, not a shrug.
test("a phase is open, for sale, or on its way", () => {
  const ownsPhase1 = (s: number) => s <= 3;
  const released = (s: number) => s === 1;

  assert.equal(moduleState(phase1, { owns: ownsPhase1, released }), "open");
  assert.equal(moduleState(phase2, { owns: ownsPhase1, released }), "buy", "not bought: offer it");
  assert.equal(
    moduleState(phase2, { owns: () => true, released }),
    "coming",
    "bought but nothing written yet",
  );
});

test("free material and the Introduction are always open", () => {
  const never = () => false;
  assert.equal(moduleState(free, { owns: never, released: never }), "open");
  assert.equal(moduleState(intro, { owns: never, released: never }), "open");
});

// The numbers in the app are the numbers in the workbook: the Start page is 0,
// so "2" on screen is Part 2 and not the second row of a list.
test("a lesson carries the part number from the workbook", () => {
  assert.deepEqual(
    lessonsOfStep(1, parts).map((l) => l.number),
    [0, 1, 2],
  );
});

// A person plans an evening, not a video, so a lesson adds the two together.
test("a lesson says how long the video and the exercises take together", () => {
  assert.equal(lessonTime("12–16 min", "75–100 min"), "1 h 25 – 1 h 55");
  assert.equal(lessonTime("12–15 min", "3–5 hours"), "3 h 10 – 5 h 15");
  assert.equal(lessonTime("8–10 min", "45 min"), "55 min", "one figure when both ends agree");
  assert.equal(lessonTime(null, "20–30 min"), "20–30 min", "the Start page has no video");
  assert.equal(lessonTime("8–12 min", "A trip"), "8–12 min · A trip", "a trip is never arithmetic");
  assert.equal(lessonTime(null, null), undefined);
});
