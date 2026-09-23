import assert from "node:assert/strict";
import { test } from "node:test";
import { toNumber } from "../src/lib/numbers.ts";

test("reads thousands separators and currency signs", () => {
  assert.equal(toNumber("1.500"), 1500);
  assert.equal(toNumber("1,500"), 1500);
  assert.equal(toNumber("1 500"), 1500);
  assert.equal(toNumber("€200"), 200);
  assert.equal(toNumber("€ 1.200"), 1200);
  assert.equal(toNumber("1.234.567"), 1234567);
});

test("reads decimals", () => {
  assert.equal(toNumber("12,50"), 12.5);
  assert.equal(toNumber("12.50"), 12.5);
  assert.equal(toNumber("12.5"), 12.5);
  assert.equal(toNumber("1,234.56"), 1234.56);
  assert.equal(toNumber("1.234,56"), 1234.56);
});

test("empty or unclear input counts as 0", () => {
  assert.equal(toNumber(""), 0);
  assert.equal(toNumber(undefined), 0);
  assert.equal(toNumber("abc"), 0);
});

test("reviewer case: 1.500 + 1,500 + €200 + 12,50 = 3212.5 (shows €3,213)", () => {
  const sum = ["1.500", "1,500", "€200", "12,50"].map(toNumber).reduce((a, b) => a + b, 0);
  assert.equal(sum, 3212.5);
});
