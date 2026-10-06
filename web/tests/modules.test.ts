import assert from "node:assert/strict";
import { test } from "node:test";
import {
  moduleProgress,
  moduleState,
  partsOfModule,
  watchedKey,
  type ModuleDef,
} from "../src/lib/modules.ts";

const stepParts = (step: number) =>
  step === 1
    ? [
        { id: "p1", label: "Part 1", title: "Picture your new life", firstPage: "1.0" },
        { id: "p2", label: "Part 2", title: "Look honestly at today", firstPage: "2.1" },
      ]
    : [];

const step1: ModuleDef = { id: "step-1", step: 1, name: "Step 1 · Picture" };
const free: ModuleDef = {
  id: "free",
  name: "Free material",
  items: [{ id: "introduction", title: "Welcome" }],
};

test("a step module takes its parts from the step, so a part is named once", () => {
  const parts = partsOfModule(step1, stepParts);
  assert.deepEqual(parts.map((p) => p.title), ["Part 1 · Picture your new life", "Part 2 · Look honestly at today"]);
  assert.equal(parts[0].exerciseHref, "/step/1/p1/1.0", "and leads into its own exercises");
});

test("a module that is not a step lists what it holds", () => {
  const parts = partsOfModule(free, stepParts);
  assert.deepEqual(parts.map((p) => p.id), ["introduction"]);
  assert.equal(parts[0].exerciseHref, undefined, "the Introduction has no exercises of its own");
});

// Watching is counted apart from exercises on purpose: someone working in the
// printed workbook never moves the exercise count and must still see progress.
test("module progress counts what has been watched", () => {
  const parts = partsOfModule(step1, stepParts);
  assert.deepEqual(moduleProgress(step1, parts, {}), { done: 0, total: 2, percent: 0, complete: false });

  const one = { [watchedKey("step-1", "p1")]: true };
  assert.deepEqual(moduleProgress(step1, parts, one), { done: 1, total: 2, percent: 50, complete: false });

  const both = { ...one, [watchedKey("step-1", "p2")]: true };
  assert.deepEqual(moduleProgress(step1, parts, both), { done: 2, total: 2, percent: 100, complete: true });
});

test("the watched key cannot collide with an exercise id", () => {
  assert.equal(watchedKey("step-1", "p1"), "module:step-1:p1");
  assert.ok(watchedKey("step-1", "1.2").startsWith("module:"), "never a bare page id");
});

test("nothing divides by zero when a module has no parts yet", () => {
  const empty: ModuleDef = { id: "step-9", step: 9, name: "Step 9" };
  assert.deepEqual(moduleProgress(empty, [], {}), { done: 0, total: 0, percent: 0, complete: false });
});

test("a module is open, locked, or not written yet", () => {
  const released = (s: number) => s === 1;
  assert.equal(moduleState(step1, { released, open: () => true }), "open");
  assert.equal(moduleState(step1, { released, open: () => false }), "locked", "written, released, not bought");
  assert.equal(
    moduleState({ id: "step-4", step: 4, name: "Step 4" }, { released, open: () => true }),
    "not-released",
    "owned but not written yet",
  );
  assert.equal(moduleState(free, { released, open: () => true }), "open", "free is never a step");
});
