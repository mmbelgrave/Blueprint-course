import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/*
 * Review round 6 found the partner seat opening no doors at all: three routes
 * asked what this person had bought instead of what their household may open,
 * and the unit tests passed because they tested the function nobody called.
 *
 * So these tests are about the call sites, not the rules. They read the routes
 * and insist that every door asks the one question. A new route that forgets
 * fails here rather than in somebody's hands.
 */

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

/** Every route that hands something over on the strength of a purchase. */
const DOORS = [
  "app/api/content/route.ts",
  "app/api/workbook/route.ts",
  "app/api/video/url/route.ts",
  "app/api/draft/route.ts",
  "app/api/partner/route.ts",
];

test("every door asks what the household may open", () => {
  for (const door of DOORS) {
    const source = read(door);
    assert.match(source, /myAccess\(/, `${door} does not call myAccess`);
    assert.doesNotMatch(
      source,
      /myEntitlements\(/,
      `${door} asks myEntitlements, which leaves a partner outside their own course`,
    );
  }
});

test("no door reads the entitlements table behind the access layer's back", () => {
  for (const door of DOORS) {
    assert.doesNotMatch(
      read(door),
      /from\("entitlements"\)/,
      `${door} reads entitlements directly, so a seat would not count`,
    );
  }
});

test("myAccess is the only place the seat widens access", () => {
  const source = read("lib/access-server.ts");
  assert.match(source, /export async function myAccess/);
  assert.match(source, /householdEntitlements/);
});

test("the seat route still asks about this person's own purchase", () => {
  // A partner may not pass the seat on to a third person, so this one door
  // deliberately asks the narrower question.
  const source = read("app/api/seat/route.ts");
  assert.match(source, /myEntitlements\(/);
  assert.match(source, /role === "partner"/);
});

test("shared answers are written through the household, never straight to the table", () => {
  const client = read("lib/household-client.ts");
  assert.match(client, /\/api\/household\/answer/);
  const state = read("lib/app-state.tsx");
  // The browser decides per answer; the decision has to be made from the
  // household, not assumed.
  assert.match(state, /sharedAnswer\(/);
});
