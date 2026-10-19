import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/*
 * R4-10, from review round 4.
 *
 * `/api/workbook?free=...` takes that branch before it asks anybody about
 * purchases, so the lookup behind it is the whole gate. It used to search
 * every module's items, which was safe only because the one item in the file
 * happened to belong to the free module. An exercise added under Phase 1 would
 * have been handed to anybody signed in.
 *
 * These read the source rather than calling the function, because the module
 * imports content through the `@/` alias and the test runner has no alias.
 */
const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("the free PDF lookup only searches free modules", () => {
  const source = read("lib/modules-app.ts");
  assert.match(source, /freeItemById[\s\S]{0,400}kind === "free"/);
  assert.doesNotMatch(
    source,
    /freeItemById = \(id: string\) => modules\.flatMap/,
    "freeItemById is back to searching every module",
  );
});

test("the workbook route still answers that branch first, which is why the lookup is the gate", () => {
  assert.match(read("app/api/workbook/route.ts"), /freeItemById\(freeId\)/);
});

test("today every item with a PDF sits in a module of the free kind", () => {
  const modules = JSON.parse(read("content/modules.json")) as
    | { id: string; kind: string; items?: { id: string }[] }[]
    | { modules: { id: string; kind: string; items?: { id: string }[] }[] };
  const list = Array.isArray(modules) ? modules : modules.modules;
  const paidWithItems = list.filter((m) => m.kind !== "free" && (m.items ?? []).length > 0);
  // Not a rule, a fact: if this ever fails, the filter above is what stands
  // between those items and everybody with an account.
  assert.deepEqual(paidWithItems.map((m) => m.id), []);
  assert.ok(list.some((m) => m.kind === "free" && (m.items ?? []).length > 0), "no free items at all");
});
