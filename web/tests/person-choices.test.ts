import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPersonChoices, type AiProfile } from "../src/lib/profile-fields.ts";

// What the model returned, built from the notes as they were when the update started.
const modelResult: AiProfile = {
  fears: ["Losing my house"],
  values: ["Freedom"],
  patterns_and_tensions: ["Wants freedom, but afraid of losing the house"],
  _locked: [],
  _forgotten: [],
};

test("review R2-1: 'Forget this' pressed during the update is not undone", () => {
  // While the model was busy, the person forgot "fears".
  const latest: AiProfile = { fears: [], _forgotten: ["fears"], _locked: [] };
  const out = applyPersonChoices(modelResult, latest);
  assert.deepEqual(out.fears, []);
  assert.deepEqual(out._forgotten, ["fears"]);
});

test("review R2 concern 1: a newly forgotten topic also clears the patterns note", () => {
  const out = applyPersonChoices(modelResult, { _forgotten: ["fears"], _locked: [] });
  assert.deepEqual(out.patterns_and_tensions, []);
});

test("'Correct this' pressed during the update is kept", () => {
  const latest: AiProfile = { values: ["Family", "Nature"], _locked: ["values"], _forgotten: [] };
  const out = applyPersonChoices(modelResult, latest);
  assert.deepEqual(out.values, ["Family", "Nature"]);
  assert.deepEqual(out._locked, ["values"]);
});

test("without new choices, the model's notes are kept", () => {
  const out = applyPersonChoices(modelResult, { _locked: [], _forgotten: [] });
  assert.deepEqual(out.fears, ["Losing my house"]);
  assert.deepEqual(out.patterns_and_tensions, modelResult.patterns_and_tensions);
});

test("a corrected patterns note is never cleared", () => {
  const latest: AiProfile = {
    patterns_and_tensions: ["My own words"],
    _locked: ["patterns_and_tensions"],
    _forgotten: ["fears"],
  };
  const out = applyPersonChoices(modelResult, latest);
  assert.deepEqual(out.patterns_and_tensions, ["My own words"]);
});
