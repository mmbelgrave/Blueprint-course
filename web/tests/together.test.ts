import assert from "node:assert/strict";
import { test } from "node:test";
import {
  asksForAgreement,
  isShared,
  kindOf,
  mineFieldsOf,
  personalPages,
  privateAllowed,
  sharedPages,
  statusIsShared,
  type TogetherConfig,
} from "../src/lib/together.ts";
import real from "../src/content/together.json" with { type: "json" };

const config: TogetherConfig = {
  pages: { "3.2": "ours", "1.4": "mine", "s2-1.1": "read", "s3-2.2": "ours" },
  mine_fields: { note: "ignored", "s3-2.2": ["biggest_fear"] },
  private_allowed: { pages: ["2.3"] },
  agree_after: { pages: ["5.1"] },
};

test("a shared page is shared, a personal one is not", () => {
  assert.equal(kindOf(config, "3.2"), "ours");
  assert.equal(kindOf(config, "1.4"), "mine");
  assert.equal(isShared(config, "3.2", "costs"), true);
  assert.equal(isShared(config, "1.4", "must_haves"), false);
});

test("a page nobody has decided about stays personal", () => {
  assert.equal(kindOf(config, "9.9"), "mine");
  assert.equal(isShared(config, "9.9", "anything"), false);
});

test("a personal box on a shared page is not shared", () => {
  assert.equal(isShared(config, "s3-2.2", "risks"), true);
  assert.equal(isShared(config, "s3-2.2", "biggest_fear"), false);
  assert.deepEqual(mineFieldsOf(config, "s3-2.2"), ["biggest_fear"]);
});

test("the note in mine_fields is not mistaken for a field list", () => {
  assert.deepEqual(mineFieldsOf(config, "note"), []);
});

test("a shared page's progress belongs to the household, even with a personal box on it", () => {
  assert.equal(statusIsShared(config, "3.2"), true);
  assert.equal(statusIsShared(config, "s3-2.2"), true);
  assert.equal(statusIsShared(config, "1.4"), false);
});

test("the lists are what they say", () => {
  assert.deepEqual(sharedPages(config), ["3.2", "s3-2.2"]);
  assert.deepEqual(personalPages(config), ["1.4"]);
  assert.equal(privateAllowed(config, "2.3"), true);
  assert.equal(privateAllowed(config, "1.4"), false);
  assert.equal(asksForAgreement(config, "5.1"), true);
});

test("the real file: the money thread is shared and the wishes are not", () => {
  const live = real as unknown as TogetherConfig;
  for (const page of ["3.2", "3.3", "3.4", "3.5", "money_picture", "s2-3.1", "s2-5.2", "s3-1.1", "green_lights"]) {
    assert.equal(kindOf(live, page), "ours", `${page} should be answered together`);
  }
  for (const page of ["1.4", "1.2", "2.1", "s2-4.3", "s3-4.1", "s3-4.2"]) {
    assert.equal(kindOf(live, page), "mine", `${page} should be answered alone`);
  }
});

test("the real file: every page the documents read is accounted for", () => {
  const live = real as unknown as TogetherConfig;
  // The four result documents read these; an unlisted one would silently
  // become personal and a couple would get two different Blueprints.
  for (const page of ["5.1", "s2-5.1", "s3-4.2", "s3-1.1", "s3-3.1", "change_plan"]) {
    assert.ok(live.pages[page], `${page} is missing from together.json`);
  }
});
