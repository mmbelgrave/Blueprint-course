import assert from "node:assert/strict";
import { test } from "node:test";
import { agreedWords, differences, hasWritten, listOf, overlap, rows, same } from "../src/lib/compare.ts";
import { mayCompare, waitingBecause, isShared, AGREED_FIELD, type TogetherConfig } from "../src/lib/together.ts";

test("nothing of theirs until I have written mine", () => {
  assert.equal(mayCompare({ mineWritten: false, theirsWritten: true, theirsPrivate: false }), false);
  assert.equal(mayCompare({ mineWritten: true, theirsWritten: false, theirsPrivate: false }), false);
  assert.equal(mayCompare({ mineWritten: true, theirsWritten: true, theirsPrivate: false }), true);
});

test("a page kept private stays private, even when both have written", () => {
  assert.equal(mayCompare({ mineWritten: true, theirsWritten: true, theirsPrivate: true }), false);
  assert.equal(waitingBecause({ mineWritten: true, theirsWritten: true, theirsPrivate: true }), "theirs-private");
});

test("the page knows which thing it is waiting for", () => {
  assert.equal(waitingBecause({ mineWritten: false, theirsWritten: false, theirsPrivate: false }), "neither");
  assert.equal(waitingBecause({ mineWritten: false, theirsWritten: true, theirsPrivate: false }), "only-them");
  assert.equal(waitingBecause({ mineWritten: true, theirsWritten: false, theirsPrivate: false }), "only-me");
  assert.equal(waitingBecause({ mineWritten: true, theirsWritten: true, theirsPrivate: false }), null);
});

test("the agreed answer is shared, but only on the two pages that ask for one", () => {
  const config: TogetherConfig = {
    pages: { "5.1": "mine", "1.4": "mine", "3.2": "ours" },
    mine_fields: {},
    private_allowed: { pages: [] },
    agree_after: { pages: ["5.1"] },
  };
  assert.equal(isShared(config, "5.1", AGREED_FIELD), true);
  assert.equal(isShared(config, "1.4", AGREED_FIELD), false);
  assert.equal(isShared(config, "5.1", "next_step"), false, "the rest of 5.1 stays mine");
});

test("the same word written differently is the same word", () => {
  assert.ok(same("Time outside every day", "time outside every day."));
  assert.ok(same("  Peace of mind ", "peace of  mind"));
  assert.ok(!same("Freedom", "Independence"));
});

test("what both wrote, and what only one did", () => {
  const mine = ["Time outside every day", "Work I choose", "A workshop"];
  const theirs = ["work i choose", "Time outside every day.", "My sister within a day's travel"];
  const result = overlap(mine, theirs);
  assert.deepEqual(result.both, ["Time outside every day", "Work I choose"], "kept in my own words");
  assert.deepEqual(result.onlyMine, ["A workshop"]);
  assert.deepEqual(result.onlyTheirs, ["My sister within a day's travel"]);
});

test("a blank box is not an answer", () => {
  assert.equal(hasWritten({}), false);
  assert.equal(hasWritten({ a: "   " }), false);
  assert.equal(hasWritten({ a: [] }), false);
  assert.equal(hasWritten({ a: ["", "  "] }), false);
  assert.equal(hasWritten({ a: "something" }), true);
  assert.equal(hasWritten({ a: { r0: { today: "" } } }), false);
  assert.equal(hasWritten({ a: { r0: { today: "1200" } } }), true);
});

test("a list of written lines, and nothing else", () => {
  assert.deepEqual(listOf(["one", " two ", ""]), ["one", "two"]);
  assert.equal(listOf([]), null);
  assert.equal(listOf("one"), null);
  assert.equal(listOf({ r0: "one" }), null);
});

test("a field neither of them wrote in is left out", () => {
  const made = rows(["values", "keep", "empty"], { values: ["Freedom"], keep: "My clients" }, { values: ["freedom"] });
  assert.deepEqual(
    made.map((r) => r.fieldId),
    ["values", "keep"],
  );
  assert.equal(made[0].kind, "list");
  assert.equal(made[1].kind, "value");
});

test("the agreed answer is not one of the two sides", () => {
  const made = rows(["values", AGREED_FIELD], { values: ["Freedom"], agreed: "Go in spring" }, {}, [AGREED_FIELD]);
  assert.deepEqual(
    made.map((r) => r.fieldId),
    ["values"],
  );
});

test("the page's own summary lines: agreed, and the differences", () => {
  const made = rows(
    ["values", "must_haves"],
    { values: ["Freedom", "Nature"], must_haves: ["A workshop"] },
    { values: ["nature", "Health"], must_haves: ["A school"] },
  );
  assert.deepEqual(agreedWords(made), ["Nature"]);
  assert.deepEqual(differences(made), { mine: ["Freedom", "A workshop"], theirs: ["Health", "A school"] });
});
