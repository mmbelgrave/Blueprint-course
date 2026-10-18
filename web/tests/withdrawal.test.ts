import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accessEndsAt,
  accessIsOver,
  daysBetween,
  mayWithdraw,
  sameEmail,
  windowFor,
  withdrawalMail,
  withdrawalNotice,
  type Order,
} from "../src/lib/withdrawal.ts";

/*
 * Withdrawing from the contract (Terms §9).
 *
 * The edges are where money and law meet, so they are the tests: the last day
 * that still counts, the first that does not, and the three working days that
 * decide when somebody loses access to what they wrote.
 */

const order = (over: Partial<Order> = {}): Order => ({
  orderId: "LS-1234",
  email: "buyer@example.com",
  product: "phase1",
  status: "active",
  amountCents: 9900,
  currency: "EUR",
  boughtAt: "2026-10-01T09:00:00Z",
  ...over,
});

test("day 14 is still inside the legal right, day 15 is not", () => {
  assert.equal(windowFor("2026-10-01", "2026-10-15"), "withdrawal", "fourteen days after");
  assert.equal(windowFor("2026-10-01", "2026-10-16"), "guarantee", "fifteen days after");
  assert.equal(windowFor("2026-10-01", "2026-10-01"), "withdrawal", "the day itself");
});

test("the time of day never decides it", () => {
  // Bought late at night, withdrawing early in the morning on day 14.
  assert.equal(windowFor("2026-10-01T23:50:00Z", "2026-10-15T00:10:00Z"), "withdrawal");
  assert.equal(daysBetween("2026-10-01T23:50:00Z", "2026-10-15T00:10:00Z"), 14);
});

test("the thirty-day guarantee, and then nothing", () => {
  assert.equal(windowFor("2026-10-01", "2026-10-31"), "guarantee", "day 30");
  assert.equal(windowFor("2026-10-01", "2026-11-01"), "closed", "day 31");
});

test("three working days skip the weekend", () => {
  // Thursday 15 October 2026: Friday, Monday, Tuesday.
  assert.equal(accessEndsAt("2026-10-15T10:00:00Z").toISOString().slice(0, 10), "2026-10-20");
  // Monday: Tuesday, Wednesday, Thursday.
  assert.equal(accessEndsAt("2026-10-19T10:00:00Z").toISOString().slice(0, 10), "2026-10-22");
  // Saturday: Monday, Tuesday, Wednesday.
  assert.equal(accessEndsAt("2026-10-17T10:00:00Z").toISOString().slice(0, 10), "2026-10-21");
});

test("access ends when the moment arrives, not before", () => {
  const ends = accessEndsAt("2026-10-15T10:00:00Z");
  assert.equal(accessIsOver(ends, "2026-10-19T23:59:00Z"), false);
  assert.equal(accessIsOver(ends, ends), true);
  assert.equal(accessIsOver(ends, "2026-10-21T00:00:00Z"), true);
});

test("an order nobody can find is refused in words somebody can act on", () => {
  const no = mayWithdraw(null);
  assert.equal(no.ok, false);
  assert.match(no.ok === false ? no.why : "", /order number and the email/);
});

test("an order already refunded is not refunded twice", () => {
  const no = mayWithdraw(order({ status: "refunded" }), "2026-10-05");
  assert.equal(no.ok, false);
  assert.match(no.ok === false ? no.why : "", /already been refunded/);
});

test("after both windows the door is not slammed", () => {
  const no = mayWithdraw(order(), "2026-12-01");
  assert.equal(no.ok, false);
  assert.match(no.ok === false ? no.why : "", /Email info@maderealblueprint.com anyway/);
});

test("inside the windows it says which one, because the page says different things", () => {
  const legal = mayWithdraw(order(), "2026-10-10");
  assert.deepEqual(legal, { ok: true, window: "withdrawal" });
  const promise = mayWithdraw(order(), "2026-10-20");
  assert.deepEqual(promise, { ok: true, window: "guarantee" });
});

test("the email address matches however it was typed", () => {
  assert.ok(sameEmail("Buyer@Example.com ", "buyer@example.com"));
  assert.ok(!sameEmail("buyer@example.com", "other@example.com"));
  assert.ok(!sameEmail(null, "buyer@example.com"));
});

test("the letter states the date, the time and the full amount", () => {
  const mail = withdrawalMail({
    orderId: "LS-1234",
    amountCents: 9900,
    currency: "EUR",
    requestedAt: "2026-10-15T14:05:00Z",
    endsAt: accessEndsAt("2026-10-15T14:05:00Z"),
  });
  assert.match(mail.text, /15 October 2026 at 14:05/);
  assert.match(mail.text, /€99\.00 in full/);
  assert.match(mail.text, /20 October 2026/);
  assert.match(mail.text, /order LS-1234/);
  assert.match(mail.subject, /withdrawal/i);
});

test("the note to Mwata says what to do and by when", () => {
  const note = withdrawalNotice({
    orderId: "LS-1234",
    email: "buyer@example.com",
    amountCents: 9900,
    currency: "EUR",
    endsAt: "2026-10-20T14:05:00Z",
  });
  assert.match(note.text, /Refund it in Lemon Squeezy/);
  assert.match(note.text, /€99\.00/);
  assert.match(note.subject, /buyer@example\.com/);
});
