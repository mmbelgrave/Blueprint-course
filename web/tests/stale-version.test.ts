import assert from "node:assert/strict";
import { test } from "node:test";
import { isStaleVersion, mayReload, MIN_MS_BETWEEN_RELOADS } from "../src/lib/stale-version.ts";

// A tab open across a release reports the missing file in several ways,
// depending on the browser. All of them mean the same thing.
test("the ways a browser says 'that file is gone'", () => {
  const seen = [
    { name: "ChunkLoadError", message: "Loading chunk 472 failed." },
    { name: "Error", message: "Loading CSS chunk 8 failed." },
    { name: "TypeError", message: "Failed to fetch dynamically imported module: https://app.example/_next/x.js" },
    { name: "TypeError", message: "error loading dynamically imported module" },
    { name: "Error", message: "Importing a module script failed." },
  ];
  for (const e of seen) assert.equal(isStaleVersion(e), true, e.message);
});

test("a real fault is not mistaken for an old version", () => {
  for (const e of [
    { name: "TypeError", message: "Cannot read properties of undefined (reading 'fields')" },
    { name: "Error", message: "Could not read the database" },
    { name: "Error", message: "" },
  ]) {
    assert.equal(isStaleVersion(e), false, e.message);
  }
  assert.equal(isStaleVersion(null), false);
  assert.equal(isStaleVersion(undefined), false);
});

// One reload fixes it. Two in a row would be a spinning page.
test("at most one automatic reload a minute", () => {
  const now = 1_000_000;
  assert.equal(mayReload(now, null), true, "nothing remembered: reload");
  assert.equal(mayReload(now, now - 1_000), false, "just reloaded: do not spin");
  assert.equal(mayReload(now, now - MIN_MS_BETWEEN_RELOADS - 1), true, "long enough ago: reload again");
  assert.equal(mayReload(now, Number.NaN), true, "unreadable memory: reload");
});
