import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTheme, readTheme, resolveTheme, THEME_CHOICES } from "../src/lib/theme.ts";

test("anything unexpected in storage means 'follow my device'", () => {
  assert.equal(readTheme("dark"), "dark");
  assert.equal(readTheme("light"), "light");
  assert.equal(readTheme("system"), "system");
  assert.equal(readTheme(null), "system", "nothing chosen yet");
  assert.equal(readTheme("Dark"), "system", "not one of ours");
  assert.equal(readTheme(""), "system");
});

test("the device decides only when the person has not", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark", "a choice beats the device");
  assert.equal(resolveTheme("light", true), "light", "a choice beats the device");
});

// Light is the app as it has always been, so it is marked by nothing at all.
test("only dark marks the page", () => {
  const root = { dataset: {} as DOMStringMap };
  applyTheme(root, "dark");
  assert.equal(root.dataset.theme, "dark");
  applyTheme(root, "light");
  assert.equal(root.dataset.theme, undefined, "light leaves no trace");
});

test("every choice is offered with a reason", () => {
  assert.deepEqual(THEME_CHOICES.map((c) => c.value), ["system", "light", "dark"]);
  for (const c of THEME_CHOICES) {
    assert.ok(c.label.length > 2, c.value);
    assert.ok(c.note.length > 10, `${c.value} needs to say what it means`);
  }
});
