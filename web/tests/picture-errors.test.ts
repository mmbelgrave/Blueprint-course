import assert from "node:assert/strict";
import { test } from "node:test";
import { friendlyError } from "../src/lib/picture-errors.ts";

// Review round 3, finding 4: a person adding a photo should never read
// Supabase's own words, or a browser's "could not be decoded".
test("the picture store is not switched on yet", () => {
  const said = friendlyError("Bucket not found");
  assert.match(said, /picture store is not ready/i);
  assert.doesNotMatch(said, /bucket/i);
});

test("an expired sign-in, however Supabase words it", () => {
  for (const raw of [
    "new row violates row-level security policy",
    "invalid JWT: token is expired",
    "Unauthorized",
  ]) {
    assert.match(friendlyError(raw), /sign-in has expired/i, raw);
  }
});

test("an iPhone photo this browser cannot read says what to do about it", () => {
  const said = friendlyError("The source image could not be decoded");
  assert.match(said, /HEIC/);
  assert.match(said, /Most Compatible/);
});

test("a picture that is still too big, and a lost connection", () => {
  assert.match(friendlyError("Payload too large"), /too big/i);
  assert.match(friendlyError("TypeError: Failed to fetch"), /check your internet/i);
});

test("anything unknown still gets a plain sentence, never an empty one", () => {
  for (const raw of ["", "something odd happened 42"]) {
    const said = friendlyError(raw);
    assert.match(said, /could not be added/i);
    assert.ok(said.length > 20);
  }
});
