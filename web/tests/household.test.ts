import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alone,
  conflict,
  householdFrom,
  invitationProblem,
  isPair,
  mayWriteShared,
  type Seat,
} from "../src/lib/household.ts";

const BUYER = "buyer-1";
const PARTNER = "partner-1";

const seat = (over: Partial<Seat> = {}): Seat => ({
  buyer_id: BUYER,
  email: "ben@example.com",
  partner_id: PARTNER,
  status: "active",
  ...over,
});

test("nobody invited: a person is their own household", () => {
  const house = householdFrom(BUYER, null);
  assert.deepEqual(house, alone(BUYER));
  assert.equal(isPair(house), false);
  assert.equal(mayWriteShared(house, BUYER), true);
  assert.equal(mayWriteShared(house, PARTNER), false);
});

test("invited but not yet signed in: the buyer is waiting, and alone in practice", () => {
  const house = householdFrom(BUYER, seat({ status: "invited", partner_id: null }));
  assert.equal(house.role, "buyer");
  assert.equal(house.ownerId, BUYER);
  assert.equal(house.otherId, null);
  assert.equal(house.waiting, true);
  assert.equal(house.email, "ben@example.com");
  assert.equal(isPair(house), false);
});

test("both in: the shared answers live on the buyer's rows, whoever is asking", () => {
  const asBuyer = householdFrom(BUYER, seat());
  const asPartner = householdFrom(PARTNER, seat());
  assert.equal(asBuyer.ownerId, BUYER);
  assert.equal(asPartner.ownerId, BUYER);
  assert.equal(asBuyer.otherId, PARTNER);
  assert.equal(asPartner.otherId, BUYER);
  assert.equal(asPartner.role, "partner");
  assert.equal(asBuyer.waiting, false);
  assert.ok(mayWriteShared(asBuyer, BUYER));
  assert.ok(mayWriteShared(asPartner, PARTNER));
});

test("an ended seat is no household: the partner keeps only their own", () => {
  const house = householdFrom(PARTNER, seat({ status: "ended" }));
  assert.deepEqual(house, alone(PARTNER));
  const buyerSide = householdFrom(BUYER, seat({ status: "ended" }));
  assert.deepEqual(buyerSide, alone(BUYER));
});

test("a stranger named in nobody's seat is alone, even if a row is handed over", () => {
  assert.deepEqual(householdFrom("someone-else", seat()), alone("someone-else"));
});

test("a partner on an invited row cannot write shared answers yet", () => {
  const house = householdFrom(PARTNER, seat({ status: "invited" }));
  assert.equal(house.role, "alone");
  assert.equal(mayWriteShared(house, PARTNER), true, "they may still write their own");
});

test("my own earlier answer is never a conflict", () => {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 60_000).toISOString();
  assert.deepEqual(conflict({ changed_by: BUYER, updated_at: later }, { userId: BUYER, loadedAt: now }), {
    kind: "none",
  });
});

test("an answer written before the seat existed is never a conflict", () => {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 60_000).toISOString();
  assert.deepEqual(conflict({ changed_by: null, updated_at: later }, { userId: PARTNER, loadedAt: now }), {
    kind: "none",
  });
});

test("the other person writing after I opened the page is a conflict", () => {
  const opened = new Date("2026-10-15T09:00:00Z").toISOString();
  const theirs = new Date("2026-10-15T09:04:00Z").toISOString();
  assert.deepEqual(conflict({ changed_by: PARTNER, updated_at: theirs }, { userId: BUYER, loadedAt: opened }), {
    kind: "theirs",
    changedBy: PARTNER,
    at: theirs,
  });
});

test("the other person writing before I opened the page is not: I already have it", () => {
  const theirs = new Date("2026-10-15T09:00:00Z").toISOString();
  const opened = new Date("2026-10-15T09:04:00Z").toISOString();
  assert.deepEqual(conflict({ changed_by: PARTNER, updated_at: theirs }, { userId: BUYER, loadedAt: opened }), {
    kind: "none",
  });
});

test("an empty answer is not a conflict", () => {
  assert.deepEqual(conflict(null, { userId: BUYER, loadedAt: new Date().toISOString() }), { kind: "none" });
  assert.deepEqual(conflict({ changed_by: PARTNER, updated_at: null }, { userId: BUYER, loadedAt: "x" }), {
    kind: "none",
  });
});

test("an invitation needs an address, and not your own", () => {
  assert.match(invitationProblem("", "lotte@example.com") ?? "", /type the email address/);
  assert.match(invitationProblem("ben", "lotte@example.com") ?? "", /does not look like/);
  assert.match(invitationProblem("  LOTTE@example.com ", "lotte@example.com") ?? "", /your own address/);
  assert.equal(invitationProblem("ben@example.com", "lotte@example.com"), null);
  assert.equal(invitationProblem(" Ben@Example.com ", "lotte@example.com"), null);
});
