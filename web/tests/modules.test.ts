import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lessonsOfStep,
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
  { id: "p1", label: "Part 1", title: "Picture your new life", firstPage: "1.0" },
  { id: "p2", label: "Part 2", title: "Look honestly at today", firstPage: "2.1" },
];

test("a step's lessons are named once, in the step's own content", () => {
  const lessons = lessonsOfStep(1, parts);
  assert.deepEqual(lessons.map((l) => l.title), ["Part 1 · Picture your new life", "Part 2 · Look honestly at today"]);
  assert.equal(lessons[0].exerciseHref, "/step/1/p1/1.0");
});

test("watching is counted per lesson, under a key that cannot collide", () => {
  const lessons = lessonsOfStep(1, parts);
  assert.deepEqual(progressOfLessons("phase-1", "step-1", lessons, {}), {
    done: 0,
    total: 2,
    percent: 0,
    complete: false,
  });
  const one = { [watchedKey("phase-1", "step-1", "p1")]: true };
  assert.deepEqual(progressOfLessons("phase-1", "step-1", lessons, one), {
    done: 1,
    total: 2,
    percent: 50,
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
