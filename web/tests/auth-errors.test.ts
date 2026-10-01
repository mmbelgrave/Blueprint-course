import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanCode, friendlySignInError } from "../src/lib/auth-errors.ts";

// Review round 3, finding 1: the code is the way in that a mail scanner cannot
// take away. What a person reads when it goes wrong has to be actionable.
test("a wrong or expired code says what to do", () => {
  for (const raw of ["Token has expired or is invalid", "Invalid token", "otp_expired"]) {
    const said = friendlySignInError(raw);
    assert.match(said, /wrong, or it has expired/i, raw);
    assert.match(said, /new one/i, raw);
  }
});

test("Supabase's waiting time is passed on in plain words", () => {
  assert.match(
    friendlySignInError("For security purposes, you can only request this after 54 seconds."),
    /wait 54 seconds/i,
  );
});

test("too many tries, and no internet", () => {
  assert.match(friendlySignInError("Email rate limit exceeded"), /few minutes/i);
  assert.match(friendlySignInError("TypeError: Failed to fetch"), /check your internet/i);
});

test("anything unknown still gets a plain sentence", () => {
  const said = friendlySignInError("something odd 42");
  assert.match(said, /try again/i);
  assert.ok(said.length > 15);
});

test("a pasted code is cleaned up: spaces, labels, extra digits", () => {
  assert.equal(cleanCode("123 456"), "123456");
  assert.equal(cleanCode("code: 123456"), "123456");
  assert.equal(cleanCode("1234567"), "123456");
  assert.equal(cleanCode("abc"), "");
  assert.equal(cleanCode(""), "");
});
