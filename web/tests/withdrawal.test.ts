import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DELETE_AFTER_ACCESS_DAYS,
  GRACE_DAYS,
  accessEndsAt,
  accessIsOver,
  daysBetween,
  homeDay,
  refundDeadline,
  refundPromise,
  reminderMail,
  sameEmail,
  sweepActs,
  whenIn,
  windowFor,
  withdrawalMail,
  withdrawalNotice,
  type Receipt,
} from "../src/lib/withdrawal.ts";

const BOUGHT = "2026-10-01T10:00:00Z";

test("day 14 is still inside the legal right, day 15 is not", () => {
  assert.equal(windowFor(BOUGHT, "2026-10-15T09:00:00Z"), "withdrawal");
  assert.equal(windowFor(BOUGHT, "2026-10-16T09:00:00Z"), "guarantee");
});

test("the time of day never decides it", () => {
  assert.equal(windowFor(BOUGHT, "2026-10-15T23:59:00Z"), "withdrawal");
  assert.equal(daysBetween(BOUGHT, "2026-10-15T00:01:00Z"), 14);
});

test("the thirty-day guarantee, and then nothing", () => {
  assert.equal(windowFor(BOUGHT, "2026-10-31T09:00:00Z"), "guarantee");
  assert.equal(windowFor(BOUGHT, "2026-11-02T09:00:00Z"), "closed");
});

test("access ends at the end of the third day, weekend or not", () => {
  // Mwata's decision of 19 October: three calendar days, not working days.
  // Friday 23 October -> the end of Monday 26 October.
  assert.equal(homeDay(accessEndsAt("2026-10-23T10:00:00Z")), "2026-10-26");
  // And the same count from a Monday.
  assert.equal(homeDay(accessEndsAt("2026-10-19T10:00:00Z")), "2026-10-22");
  assert.equal(GRACE_DAYS, 3);
});

test("a request late at night still gets its three whole days", () => {
  // 23:30 UTC on 23 October is already 00:30 on the 24th in Lisbon in summer,
  // and the date in the email has to be the date the person is living in.
  assert.equal(homeDay(accessEndsAt("2026-06-23T23:30:00Z")), "2026-06-27");
});

test("access ends when the moment arrives, not before", () => {
  const ends = accessEndsAt("2026-10-19T10:00:00Z");
  assert.equal(accessIsOver(ends, new Date(ends.getTime() - 1000)), false);
  assert.equal(accessIsOver(ends, ends), true);
});

test("the money is due fourteen days after the request", () => {
  assert.equal(refundDeadline("2026-10-19T10:00:00Z").toISOString(), "2026-11-02T10:00:00.000Z");
});

test("both windows promise the full price, and neither refuses", () => {
  assert.match(refundPromise("withdrawal"), /full price/);
  assert.match(refundPromise("guarantee"), /30-day guarantee/);
  // Past both, the request is still answered by a person.
  assert.match(refundPromise("closed"), /reply to you/);
});

test("the email address matches however it was typed", () => {
  assert.equal(sameEmail(" Mwata@Example.com ", "mwata@example.com"), true);
  assert.equal(sameEmail("a@b.com", "c@d.com"), false);
  assert.equal(sameEmail(null, "a@b.com"), false);
});

const receipt = (over: Partial<Receipt> = {}): Receipt => ({
  email: "buyer@example.com",
  name: "Renata",
  orderEntered: "9762789",
  matchedOrder: "9762789",
  product: "phase1",
  amountCents: 9900,
  currency: "EUR",
  requestedAt: "2026-10-19T10:00:00Z",
  timeZone: "Europe/Lisbon",
  endsAt: accessEndsAt("2026-10-19T10:00:00Z"),
  window: "withdrawal",
  ...over,
});

test("the letter states their clock, UTC, and what they typed", () => {
  const { subject, text } = withdrawalMail(receipt());
  assert.equal(subject, "We received your withdrawal");
  assert.match(text, /Hello Renata,/);
  assert.match(text, /You withdrew from the contract for Phase 1 of The Made Real Blueprint\./);
  assert.match(text, /\(Europe\/Lisbon\)/);
  assert.match(text, /UTC/);
  assert.match(text, /Email: buyer@example\.com/);
  assert.match(text, /Order number: 9762789/);
  assert.match(text, /€99\.00/);
  assert.match(text, /22 October 2026/);
  assert.match(text, /download your workbook/);
  assert.match(text, /30 days after your/);
  assert.match(text, /Reply to this email if you change your mind/);
});

test("a withdrawal that matched nothing says so, and promises an answer", () => {
  const { text } = withdrawalMail(
    receipt({ matchedOrder: null, orderEntered: null, endsAt: null, amountCents: null, name: null }),
  );
  assert.match(text, /Hello,/);
  assert.match(text, /could not match your email address/);
  assert.match(text, /Order number: \(not given\)/);
  assert.doesNotMatch(text, /access to the app ends/);
});

test("an unknown time zone does not lose the record", () => {
  const { zone, text } = whenIn("2026-10-19T10:00:00Z", "Mars/Olympus");
  assert.equal(zone, "UTC");
  assert.match(text, /19 October 2026/);
});

test("the note to Mwata says what to do, by when, and what did not match", () => {
  const { subject, text } = withdrawalNotice(receipt());
  assert.match(subject, /Withdrawal: buyer@example\.com/);
  assert.match(text, /Refund due by: 2 November 2026/);
  assert.match(text, /Lemon Squeezy/);
  const unmatched = withdrawalNotice(receipt({ matchedOrder: null, endsAt: null })).text;
  assert.match(unmatched, /match this by hand/);
  assert.match(unmatched, /No access was ended/);
});

test("the day-seven nudge counts the days that are left", () => {
  const { subject, text } = reminderMail({
    email: "buyer@example.com",
    matchedOrder: "9762789",
    amountCents: 9900,
    currency: "EUR",
    requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });
  assert.match(subject, /Refund still due/);
  assert.match(text, /7 days away/);
});

const open = (over: Partial<Parameters<typeof sweepActs>[0]> = {}) => ({
  status: "received",
  requested_at: "2026-10-01T10:00:00Z",
  access_ends_at: "2026-10-04T22:59:59Z",
  reminded_at: null,
  data_deleted_at: null,
  user_id: "u1",
  ...over,
});

test("the sweep does nothing on the day of the request", () => {
  assert.deepEqual(sweepActs(open(), "2026-10-01T12:00:00Z"), []);
});

test("the sweep closes the purchase once the three days are up", () => {
  assert.deepEqual(sweepActs(open(), "2026-10-05T04:00:00Z"), ["revoke"]);
});

test("day seven nudges Mwata, once", () => {
  assert.ok(sweepActs(open(), "2026-10-08T04:00:00Z").includes("remind"));
  assert.ok(!sweepActs(open({ reminded_at: "2026-10-08T04:00:00Z" }), "2026-10-09T04:00:00Z").includes("remind"));
});

test("a refund stops the nudge but not the tidying", () => {
  const refunded = open({ status: "refunded" });
  assert.deepEqual(sweepActs(refunded, "2026-10-08T04:00:00Z"), ["revoke"]);
});

test("the answers go thirty days after access ended, and not before", () => {
  assert.ok(!sweepActs(open(), "2026-11-02T04:00:00Z").includes("delete-data"));
  const after = new Date(Date.parse("2026-10-04T22:59:59Z") + DELETE_AFTER_ACCESS_DAYS * 86400000);
  assert.ok(sweepActs(open(), after).includes("delete-data"));
  // Once is enough.
  assert.ok(!sweepActs(open({ data_deleted_at: after.toISOString() }), after).includes("delete-data"));
});

test("somebody who took their withdrawal back is left entirely alone", () => {
  assert.deepEqual(sweepActs(open({ status: "cancelled" }), "2027-01-01T04:00:00Z"), []);
});

test("a withdrawal that matched no purchase never deletes anybody", () => {
  const nothing = open({ access_ends_at: null, user_id: null });
  assert.deepEqual(sweepActs(nothing, "2027-01-01T04:00:00Z"), ["remind"]);
});

test("a request we could not match promises nothing it cannot keep", () => {
  const { text } = withdrawalMail(receipt({ matchedOrder: null, endsAt: null, amountCents: null }));
  assert.match(text, /If this address bought the course, we refund the full price/);
  assert.doesNotMatch(text, /You withdrew inside the 14 days, so we refund/);
});

test("a matched request still promises plainly", () => {
  assert.match(withdrawalMail(receipt()).text, /You withdrew inside the 14 days, so we refund/);
});
