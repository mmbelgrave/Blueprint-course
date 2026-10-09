/*
 * The browser holds the spine, not the words. A page that adds up another
 * page's table therefore cannot look that table up: the server sends it with
 * the page, and these tests check that nothing is left behind.
 *
 * The bug this was written for: the 3.5 money check silently showed a dash on
 * every line, because the fields it adds up were being read out of the spine,
 * where a table has no row labels and no certainty column. Nothing failed to
 * build, nothing threw, and the page simply stopped telling anyone the truth.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ALSO_READS, referencedFields, splitRef } from "../src/lib/content-refs.ts";
import { stepNameOf } from "../src/lib/content-refs.ts";
import step1 from "../src/content/step1-content.json" with { type: "json" };
import step2 from "../src/content/step2-content.json" with { type: "json" };
import step3 from "../src/content/step3-content.json" with { type: "json" };
import spine1 from "../src/content/spine/step1.json" with { type: "json" };

type AnyPage = { id: string; start_here?: { fields?: unknown[] }; go_deeper?: { fields?: unknown[] } };
type AnyStep = { parts: { exercises: AnyPage[]; summary?: AnyPage }[] };

const steps = [step1, step2, step3] as unknown as AnyStep[];
const pages = steps.flatMap((s) => s.parts.flatMap((p) => [...p.exercises, ...(p.summary ? [p.summary] : [])]));
const byId = new Map(pages.map((p) => [p.id, p]));
const fieldsOf = (p: AnyPage) =>
  [...(p.start_here?.fields ?? []), ...(p.go_deeper?.fields ?? [])] as { id: string }[];

test("the money check names the three pages it adds up", () => {
  const refs = referencedFields(byId.get("3.5") as never);
  assert.deepEqual(refs.sort(), ["3.2.costs", "3.3.one_time", "3.4.income"]);
});

test("a page that copies an answer forward names where it comes from", () => {
  const refs = referencedFields(byId.get("s2-0.1") as never);
  assert.ok(refs.includes("5.1.life_picture"));
  assert.ok(refs.includes("1.4.must_haves"));
});

test("4.2 asks for the option names it labels its columns with", () => {
  assert.ok(referencedFields(byId.get("4.2") as never).includes("4.1.options"));
});

test("every field any page reads really exists", () => {
  for (const page of pages) {
    for (const key of referencedFields(page as never)) {
      const [from, fieldId] = splitRef(key);
      const source = byId.get(from);
      assert.ok(source, `${page.id} reads ${key}, but page ${from} does not exist`);
      assert.ok(
        fieldsOf(source).some((f) => f.id === fieldId),
        `${page.id} reads ${key}, but ${from} has no field "${fieldId}"`,
      );
    }
  }
});

test("the hand-written list points at pages that exist", () => {
  for (const [pageId, keys] of Object.entries(ALSO_READS)) {
    assert.ok(byId.get(pageId), `ALSO_READS names page ${pageId}, which does not exist`);
    for (const key of keys) {
      const [from, fieldId] = splitRef(key);
      assert.ok(
        fieldsOf(byId.get(from) ?? { id: from }).some((f) => f.id === fieldId),
        `ALSO_READS names ${key}, which does not exist`,
      );
    }
  }
});

/*
 * The reason all of the above is needed: the spine really does leave the
 * labels behind. If this ever stops being true, the sums could be read from
 * the browser's own copy again — and the tests above would be dead weight.
 */
test("nothing in the browser looks a sum's field up in its own copy", () => {
  // The bug was one import. The rule is easier to keep than to remember, so
  // it is checked here rather than left to a reviewer's eye.
  const source = readFileSync(new URL("../src/lib/field-extras.ts", import.meta.url), "utf8");
  assert.ok(
    !/\bfindExercise\b/.test(source),
    "field-extras reads another page out of the spine again; it must use the fields the server sent",
  );
});

test("the spine keeps no row labels and no column labels", () => {
  const text = JSON.stringify(spine1);
  assert.ok(!text.includes("row_labels"), "the spine still carries row labels");
  assert.ok(!text.includes("Housing (rent or mortgage)"), "the spine still carries a cost category");
  assert.ok(!text.includes("total_filter"), "the spine still carries a total filter");
});

/* ── the suggestion says which step it came from ── */

test("a carried-forward answer names the step it really came from", () => {
  // Step 3's Start page copies from both Step 1 and Step 2. Saying "Step 1"
  // over a Step 2 answer is small, wrong, and read by everybody who buys.
  assert.equal(stepNameOf("5.1"), "Step 1");
  assert.equal(stepNameOf("1.4"), "Step 1");
  assert.equal(stepNameOf("s2-5.1"), "Step 2");
  assert.equal(stepNameOf("s3-0.1"), "Step 3");
});

test("every page Step 3 copies from is named correctly", () => {
  const expected: Record<string, string> = {
    "5.1": "Step 1",
    "1.4": "Step 1",
    "s2-5.1": "Step 2",
    "s3-0.1": "Step 3",
  };
  for (const page of pages) {
    for (const key of referencedFields(page as never)) {
      const [from] = splitRef(key);
      if (expected[from]) assert.equal(stepNameOf(from), expected[from], `${page.id} reads ${key}`);
    }
  }
});
