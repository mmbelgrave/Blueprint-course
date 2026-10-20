import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CONSENT_TEXT,
  WORDING_VERSION,
  ASK_AGAIN,
  NOT_ASKED_YET,
  SWITCHED_OFF,
  aiAllowed,
  aiRefusal,
  consentState,
  founderAllowed,
  latest,
  expiredConsentIds,
  rowsToWrite,
  type ConsentRow,
} from "../src/lib/consent.ts";

const row = (
  kind: string,
  granted: boolean,
  at: string,
  version = WORDING_VERSION,
): ConsentRow => ({ kind, granted, wording_version: version, recorded_at: at });

test("no record means no AI", () => {
  assert.equal(aiAllowed([]), false);
  assert.equal(consentState([]).mustAsk, true);
});

/*
 * Review round 7, R7-10: all three refusals used to say "you switched your AI
 * partner off". Two of the three people had not.
 */
test("each refusal says what actually happened", () => {
  assert.equal(aiRefusal([]), NOT_ASKED_YET);
  assert.equal(aiRefusal([row("ai", false, "2026-10-19T10:00:00Z")]), SWITCHED_OFF);
  // The same tick, recorded against wording we have since changed.
  assert.equal(aiRefusal([row("ai", true, "2026-10-19T10:00:00Z", "2026-01-01")]), ASK_AGAIN);
  // And nothing at all to say when the partner may run.
  assert.equal(aiRefusal([row("ai", true, "2026-10-19T10:00:00Z")]), null);
});

test("a granted record at the current wording switches it on", () => {
  const rows = [row("ai", true, "2026-10-18T10:00:00Z")];
  assert.equal(aiAllowed(rows), true);
  assert.equal(consentState(rows).mustAsk, false);
  assert.equal(consentState(rows).special, false);
});

test("the newest record wins, whatever order the rows arrive in", () => {
  const rows = [
    row("ai", false, "2026-10-18T12:00:00Z"),
    row("ai", true, "2026-10-18T10:00:00Z"),
  ];
  assert.equal(aiAllowed(rows), false);
  // And the history is still there: the row that granted it was not changed.
  assert.equal(rows.filter((r) => r.granted).length, 1);
  assert.equal(latest(rows, "ai")?.granted, false);
});

test("switching it on again after switching it off works", () => {
  const rows = [
    row("ai", true, "2026-10-18T10:00:00Z"),
    row("ai", false, "2026-10-18T11:00:00Z"),
    row("ai", true, "2026-10-18T12:00:00Z"),
  ];
  assert.equal(aiAllowed(rows), true);
});

test("older wording does not count, so the person is asked again", () => {
  const rows = [row("ai", true, "2026-10-01T10:00:00Z", "2026-09-01")];
  assert.equal(aiAllowed(rows), false);
  assert.equal(consentState(rows).mustAsk, true);
});

test("special categories need their own tick at the current wording", () => {
  const both = [row("ai", true, "2026-10-18T10:00:00Z"), row("ai_special", true, "2026-10-18T10:00:00Z")];
  assert.equal(consentState(both).special, true);
  const old = [row("ai", true, "2026-10-18T10:00:00Z"), row("ai_special", true, "2026-10-01T10:00:00Z", "2026-09-01")];
  assert.equal(consentState(old).special, false);
});

test("the AI partner works with the first tick alone", () => {
  const rows = [row("ai", true, "2026-10-18T10:00:00Z"), row("ai_special", false, "2026-10-18T10:00:00Z")];
  assert.equal(aiAllowed(rows), true);
  assert.equal(consentState(rows).special, false);
});

test("Mwata's access is not re-asked when the AI wording changes", () => {
  // It is a separate tick with its own words. Bumping the AI wording must not
  // quietly close a door somebody deliberately opened.
  const rows = [row("founder_access", true, "2026-09-01T10:00:00Z", "2026-09-01")];
  assert.equal(founderAllowed(rows), true);
  assert.equal(consentState(rows).founder, true);
});

test("nothing is written when the answer is the one already recorded", () => {
  const rows = [row("ai", true, "2026-10-18T10:00:00Z")];
  assert.deepEqual(rowsToWrite(rows, { ai: true }), []);
});

test("switching off is always written", () => {
  const rows = [row("ai", true, "2026-10-18T10:00:00Z")];
  const out = rowsToWrite(rows, { ai: false });
  assert.equal(out.length, 1);
  assert.equal(out[0].granted, false);
  assert.equal(out[0].wording_version, WORDING_VERSION);
});

test("the same answer at older wording is written again", () => {
  // Otherwise agreeing to the new words would leave no record of the new words.
  const rows = [row("ai", true, "2026-10-01T10:00:00Z", "2026-09-01")];
  assert.equal(rowsToWrite(rows, { ai: true }).length, 1);
});

test("the words a version stands for are the words on the screen", () => {
  const screen = readFileSync(new URL("../src/components/ai-consent.tsx", import.meta.url), "utf8");
  assert.match(screen, /CONSENT_TEXT\.ai\b/);
  assert.match(screen, /CONSENT_TEXT\.ai_special\b/);
  assert.ok(CONSENT_TEXT.ai.includes("Anthropic"));
  assert.ok(CONSENT_TEXT.ai_special.includes("health"));
});

/*
 * The consent history sweep (19 October). The current row of each kind stays
 * while it stands; the trail behind it goes three years after it stopped.
 */
const numbered = (
  id: number,
  kind: string,
  granted: boolean,
  at: string,
): ConsentRow & { id: number } => ({ id, kind, granted, wording_version: WORDING_VERSION, recorded_at: at });

test("a consent that still stands is never deleted, however old", () => {
  const rows = [numbered(1, "ai", true, "2019-01-01T10:00:00Z")];
  assert.deepEqual(expiredConsentIds(rows, "2026-10-19T10:00:00Z"), []);
});

test("a superseded row goes three years after it was superseded", () => {
  const rows = [
    numbered(1, "ai", true, "2020-01-01T10:00:00Z"),
    numbered(2, "ai", false, "2023-01-01T10:00:00Z"),
    numbered(3, "ai", true, "2024-01-01T10:00:00Z"),
  ];
  // On 19 October 2026 the first row ended in January 2023, over three years
  // ago; the second ended in January 2024, which is not yet three years.
  assert.deepEqual(expiredConsentIds(rows, "2026-10-19T10:00:00Z"), [1]);
  // A day before its third birthday, nothing goes.
  assert.deepEqual(expiredConsentIds(rows, "2022-12-31T10:00:00Z"), []);
});

test("a refusal is its own ending, and goes three years later", () => {
  const rows = [numbered(1, "ai", false, "2023-01-01T10:00:00Z")];
  assert.deepEqual(expiredConsentIds(rows, "2026-10-19T10:00:00Z"), [1]);
  assert.deepEqual(expiredConsentIds(rows, "2025-10-19T10:00:00Z"), []);
});

test("deleting the last row only means the person is asked again", () => {
  const rows = [numbered(1, "ai", false, "2020-01-01T10:00:00Z")];
  assert.deepEqual(expiredConsentIds(rows, "2026-10-19T10:00:00Z"), [1]);
  // Which is the same state as somebody who was never asked.
  assert.equal(consentState([]).mustAsk, true);
});

test("each kind is counted on its own", () => {
  const rows = [
    numbered(1, "ai", true, "2020-01-01T10:00:00Z"),
    numbered(2, "ai", true, "2024-01-01T10:00:00Z"),
    numbered(3, "founder_access", true, "2020-01-01T10:00:00Z"),
  ];
  // The old AI row was replaced in 2024, so it is not three years old yet;
  // the founder tick from 2020 still stands, so it stays.
  assert.deepEqual(expiredConsentIds(rows, "2026-10-19T10:00:00Z"), []);
});
