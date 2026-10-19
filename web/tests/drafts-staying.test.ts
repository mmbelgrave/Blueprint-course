import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/*
 * The staying route must get the same help as the moving one.
 *
 * The AI partner may draft the summary pages that bring earlier answers
 * together. The moving Explore Summary (s2-5.1) has always been on that list.
 * S7, the staying summary, was not, so the one person the repositioning is
 * about would have been the only one writing their summary unaided.
 *
 * These read the source rather than calling it: drafts.ts imports content
 * through the `@/` alias and the test runner has no alias.
 */
const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const content = JSON.parse(read("content/step2-content.json")) as {
  parts: { exercises?: { id: string; start_here?: { fields?: { id: string; type: string }[] } }[] }[];
};

const fieldsOf = (id: string) =>
  content.parts.flatMap((p) => p.exercises ?? []).find((e) => e.id === id)?.start_here?.fields ?? [];

/** The ids drafts.ts lists for one page. */
function listed(page: string): string[] {
  const source = read("lib/drafts.ts");
  const block = new RegExp(`"${page}":\\s*\\[([^\\]]*)\\]`).exec(source);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test("the staying summary can be drafted, like the moving one", () => {
  assert.ok(listed("s2-5.1").length > 0, "the moving summary lost its draft list");
  assert.ok(listed("s2-s7").length > 0, "S7 cannot be drafted, so a staying person writes it alone");
});

test("every field the draft list names exists on the page", () => {
  // A misspelled id is silent: the button appears and drafts nothing.
  for (const page of ["s2-5.1", "s2-s7"]) {
    const real = fieldsOf(page).map((f) => f.id);
    assert.ok(real.length > 0, `${page} has no fields in the content`);
    for (const id of listed(page)) {
      assert.ok(real.includes(id), `${page} has no field "${id}"`);
    }
  }
});

test("the choice, the next step and the dates stay the person's own", () => {
  // The rule for every summary: the AI may gather, never decide.
  for (const page of ["s2-5.1", "s2-s7"]) {
    for (const id of ["choice", "next_step", "date", "review_when"]) {
      assert.ok(!listed(page).includes(id), `${page} would let the AI draft "${id}"`);
    }
  }
});

test("the AI partner's memory covers both routes", () => {
  const prompt = read("lib/partner/profile-update.ts");
  assert.match(prompt, /staying path/i);
  assert.match(read("lib/profile-fields.ts"), /a change where you live/i);
});
