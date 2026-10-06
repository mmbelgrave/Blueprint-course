import assert from "node:assert/strict";
import { test } from "node:test";
import { isWatched, shouldOfferResume, startAt, timeLabel, worthSaving } from "../src/lib/video.ts";

test("going back is offered only when there is something to go back to", () => {
  assert.equal(shouldOfferResume({ seconds: 252, duration: 600 }), true, "four minutes in");
  assert.equal(shouldOfferResume({ seconds: 12, duration: 600 }), false, "barely started");
  assert.equal(shouldOfferResume({ seconds: 595, duration: 600 }), false, "all but finished");
  assert.equal(shouldOfferResume(null), false);
  assert.equal(shouldOfferResume({ seconds: Number.NaN, duration: 600 }), false, "a broken number is not a position");
});

test("a video counts as watched when the end is in sight", () => {
  assert.equal(isWatched({ seconds: 590, duration: 600 }), true);
  assert.equal(isWatched({ seconds: 300, duration: 600 }), false);
  assert.equal(isWatched({ seconds: 300, duration: 0 }), false, "no length, no verdict");
  assert.equal(isWatched(null), false);
});

test("the player starts where the person stopped, or at the beginning", () => {
  assert.equal(startAt({ seconds: 252, duration: 600 }), 252);
  assert.equal(startAt({ seconds: 5, duration: 600 }), 0, "too early to be worth it");
  assert.equal(startAt({ seconds: 598, duration: 600 }), 0, "finished: start again");
  assert.equal(startAt(null), 0);
});

test("times read the way people say them", () => {
  assert.equal(timeLabel(252), "4:12");
  assert.equal(timeLabel(59), "0:59");
  assert.equal(timeLabel(3852), "1:04:12");
  assert.equal(timeLabel(0), "0:00");
  assert.equal(timeLabel(Number.NaN), "0:00", "never shows NaN to a person");
  assert.equal(timeLabel(-5), "0:00");
});

// A pause, a seek back and forth, or the tab hiding twice must not each cost a
// write to the database.
test("a position is only written when it really moved", () => {
  assert.equal(worthSaving(null, 0.4), false, "the very first second is not news");
  assert.equal(worthSaving(null, 30), true);
  assert.equal(worthSaving(240, 243), false, "three seconds on");
  assert.equal(worthSaving(240, 250), true);
  assert.equal(worthSaving(240, 100), true, "a jump backwards is worth keeping too");
});
