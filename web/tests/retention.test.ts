import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCESS_YEARS, GRACE_DAYS, QUIET_MONTHS, decide, quietMail, type Account } from "../src/lib/retention.ts";

const NOW = new Date("2027-06-01T09:00:00Z");

const account = (over: Partial<Account> = {}): Account => ({
  id: "u1",
  email: "someone@example.com",
  lastSeen: "2027-05-01T09:00:00Z",
  boughtAt: null,
  warnedAt: null,
  ...over,
});

/* ─────────────────────── nobody is touched too early ───────────────────── */

test("somebody who signed in last month is left alone", () => {
  assert.equal(decide(account(), NOW).act, "keep");
});

test("a year of silence is not enough", () => {
  assert.equal(decide(account({ lastSeen: "2026-06-02T09:00:00Z" }), NOW).act, "keep");
});

test("two years of silence earns one email, not a deletion", () => {
  const v = decide(account({ lastSeen: "2025-05-01T09:00:00Z" }), NOW);
  assert.equal(v.act, "warn");
});

/* ──────────────── the promise of three years beats the sweep ───────────── */

test("a buyer inside the access promise is never touched, however quiet", () => {
  const v = decide(account({ lastSeen: "2024-01-01T09:00:00Z", boughtAt: "2025-01-01T09:00:00Z" }), NOW);
  assert.deepEqual(v, { act: "keep", because: `bought within the last ${ACCESS_YEARS} years` });
});

test("and is treated like anyone else once those years have passed", () => {
  const v = decide(account({ lastSeen: "2024-01-01T09:00:00Z", boughtAt: "2024-01-01T09:00:00Z" }), NOW);
  assert.equal(v.act, "warn");
});

/* ───────────────────── the thirty days mean thirty days ────────────────── */

test("a warning yesterday does not delete anybody today", () => {
  const v = decide(account({ lastSeen: "2025-01-01T09:00:00Z", warnedAt: "2027-05-31T09:00:00Z" }), NOW);
  assert.equal(v.act, "keep");
});

test("still quiet after the thirty days: the account goes", () => {
  const v = decide(account({ lastSeen: "2025-01-01T09:00:00Z", warnedAt: "2027-05-01T09:00:00Z" }), NOW);
  assert.deepEqual(v, { act: "delete", warnedOn: "2027-05-01T09:00:00Z" });
});

test("coming back after the email tears the notice up", () => {
  const v = decide(
    account({ lastSeen: "2027-05-20T09:00:00Z", warnedAt: "2027-05-01T09:00:00Z" }),
    NOW,
  );
  assert.equal(v.act, "forget");
});

test("and the account is then safe, not deleted on the next sweep", () => {
  // The same person a day later, with the notice already torn up.
  const v = decide(account({ lastSeen: "2027-05-20T09:00:00Z", warnedAt: null }), NOW);
  assert.equal(v.act, "keep");
});

/* ─────────────────────────── nothing on nothing ────────────────────────── */

test("an account with no sign-in recorded is left alone rather than guessed at", () => {
  assert.equal(decide(account({ lastSeen: null }), NOW).act, "keep");
});

test("an unreadable date is treated as no date, never as long ago", () => {
  assert.equal(decide(account({ lastSeen: "not a date" }), NOW).act, "keep");
});

/* ───────────────────────────── the published rules ─────────────────────── */

test("the numbers are the ones the privacy note promises", () => {
  assert.equal(QUIET_MONTHS, 24);
  assert.equal(GRACE_DAYS, 30);
  assert.equal(ACCESS_YEARS, 3);
});

test("the email says how to stay, and never carries a way in", () => {
  const { subject, text } = quietMail({ name: "Anna", appUrl: "https://app.example.com", email: "a@example.com" });
  assert.match(subject, /two quiet years/);
  assert.match(text, /within the next 30 days/);
  assert.match(text, /deleted after/);
  // §3.1: the code is asked for by the person, never sent on their behalf.
  assert.ok(!/code is|your code/i.test(text.replace("you ask", "")));
});
