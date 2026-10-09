/*
 * Moving a purchase to another account (spec §6.1). The rules that stop this
 * being a way to help yourself to somebody else's course.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLAIM_MINUTES,
  CODE_LENGTH,
  MAX_ATTEMPTS,
  claimMail,
  claimUsable,
  codeMatches,
  expiresAt,
  hashCode,
  newCode,
} from "../src/lib/claim.ts";

const soon = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const row = (over: Partial<{ attempts: number; expires_at: string; used_at: string | null }> = {}) => ({
  attempts: 0,
  expires_at: soon(10),
  used_at: null,
  ...over,
});

test("a code is six digits, and not the same one twice", () => {
  const codes = new Set(Array.from({ length: 200 }, newCode));
  for (const c of codes) assert.match(c, new RegExp(`^\\d{${CODE_LENGTH}}$`));
  assert.ok(codes.size > 150, "200 codes should nearly all differ");
});

test("the code is stored as a hash, and the address is part of it", () => {
  const a = hashCode("123456", "anna@example.com");
  assert.ok(!a.includes("123456"), "the code itself is not in the hash");
  assert.notEqual(a, hashCode("123456", "someone@else.com"), "a hash cannot be replayed on another address");
  assert.equal(a, hashCode("123456", "Anna@Example.com"), "the address is compared without case");
});

test("only the right code matches", () => {
  const stored = hashCode("123456", "anna@example.com");
  assert.ok(codeMatches("123456", stored, "anna@example.com"));
  assert.ok(codeMatches(" 123456 ", stored, "anna@example.com"), "spaces around a pasted code are forgiven");
  assert.ok(!codeMatches("123457", stored, "anna@example.com"), "one digit out");
  assert.ok(!codeMatches("", stored, "anna@example.com"), "nothing");
  assert.ok(!codeMatches("123456", stored, "someone@else.com"), "right code, wrong address");
  assert.ok(!codeMatches("123456", "not a hash", "anna@example.com"), "a broken row never matches");
});

test("a code that may still be tried", () => {
  assert.deepEqual(claimUsable(row()), { ok: true });
});

test("a code that may not", () => {
  const dead = (r: ReturnType<typeof row>) => {
    const c = claimUsable(r);
    assert.equal(c.ok, false);
    assert.equal(c.ok === false && c.dead, true, "spent, so the person is told to ask again");
  };
  dead(row({ used_at: new Date().toISOString() }));
  dead(row({ expires_at: soon(-1) }));
  dead(row({ attempts: MAX_ATTEMPTS }));
  dead(row({ attempts: MAX_ATTEMPTS + 3 }));

  const none = claimUsable(null);
  assert.equal(none.ok, false);
});

test("a code lasts the time we tell people it lasts", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");
  assert.equal(expiresAt(now), new Date(now.getTime() + CLAIM_MINUTES * 60_000).toISOString());
  // One second before the deadline it still works; at the deadline it does not.
  assert.equal(claimUsable(row({ expires_at: expiresAt(now) }), new Date(now.getTime() + 1_000)).ok, true);
  assert.equal(
    claimUsable(row({ expires_at: expiresAt(now) }), new Date(now.getTime() + CLAIM_MINUTES * 60_000)).ok,
    false,
  );
});

test("the email says what is about to happen, and to which account", () => {
  const { subject, text } = claimMail({ code: "482913", signedInAs: "anna@gmail.com" });
  assert.match(subject, /482913/, "the code is in the subject, so it can be read without opening the mail");
  assert.match(text, /anna@gmail\.com/, "which account it would move to");
  assert.match(text, /If this was not you, do nothing/, "a way out for somebody who did not ask");
  assert.match(text, new RegExp(`${CLAIM_MINUTES} minutes`));
});
