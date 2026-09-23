import assert from "node:assert/strict";
import { test } from "node:test";
import { answersWithoutForgotten, PROFILE_FIELDS, PROFILE_SOURCES } from "../src/lib/profile-fields.ts";

const answers = {
  "4.4": { fears: "lonely in winter", deeper: "big fear" },
  "1.4": { values: ["Freedom"], must_haves: { r0: { must_have: "Sea" } }, dealbreakers: "Far from my daughter" },
  "1.1": { moments: ["Garden"] },
};

test("nothing forgotten: all answers stay", () => {
  assert.deepEqual(answersWithoutForgotten(answers, []), answers);
});

test("forgotten fears: page 4.4 is hidden from the AI partner", () => {
  const out = answersWithoutForgotten(answers, ["fears"]);
  assert.equal(out["4.4"], undefined);
  assert.deepEqual(out["1.1"], answers["1.1"]);
});

test("forgotten values: only that field is hidden, the rest of 1.4 stays", () => {
  const out = answersWithoutForgotten(answers, ["values"]);
  assert.equal(out["1.4"].values, undefined);
  assert.deepEqual(out["1.4"].must_haves, answers["1.4"].must_haves);
});

test("the page the person is on stays visible", () => {
  const out = answersWithoutForgotten(answers, ["fears"], "4.4");
  assert.deepEqual(out["4.4"], answers["4.4"]);
});

test("the original answers are never changed", () => {
  answersWithoutForgotten(answers, ["values", "fears"]);
  assert.deepEqual(answers["1.4"].values, ["Freedom"]);
  assert.ok(answers["4.4"]);
});

test("every note has a sources entry", () => {
  for (const f of PROFILE_FIELDS) assert.ok(Array.isArray(PROFILE_SOURCES[f.key]), f.key);
});
