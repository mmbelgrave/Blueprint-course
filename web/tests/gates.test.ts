import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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
  "app/api/video/captions/route.ts",
  "app/api/draft/route.ts",
  "app/api/partner/route.ts",
];

test("every door asks what the household may open", () => {
  for (const door of DOORS) {
    const source = read(door);
    // Either directly, or through mayWatch, which asks it for the two video
    // routes so they can never disagree about who may watch what.
    assert.match(source, /myAccess\(|mayWatch\(/, `${door} asks neither myAccess nor mayWatch`);
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
  // And the one helper standing in front of it asks it properly.
  assert.match(read("lib/video-access.ts"), /myAccess\(/);
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

/*
 * Consent, after the legal review of 18 October. The rule is the same shape as
 * the access rule above: it is worth nothing unless every AI route asks it, so
 * the test reads the routes rather than the rules.
 */
const AI_ROUTES = ["app/api/partner/route.ts", "app/api/draft/route.ts", "app/api/profile/route.ts"];

test("no AI route sends a word without a consent record", () => {
  for (const route of AI_ROUTES) {
    const source = read(route);
    assert.match(source, /mayUseAi\(/, `${route} sends words to Anthropic without asking mayUseAi`);
    assert.doesNotMatch(
      source,
      /consent_ai/,
      `${route} gates on the old profile column, which has no wording version behind it`,
    );
  }
});

test("every route that reaches for Anthropic is on that list", () => {
  // A new AI route that forgets the consent check fails here, not in somebody's
  // hands. The list above is the only place to add it.
  const routes = readdirSync(new URL("../src/app/api/", import.meta.url), { recursive: true }) as string[];
  for (const entry of routes) {
    const path = String(entry).replaceAll("\\", "/");
    if (!path.endsWith("route.ts")) continue;
    const source = read(`app/api/${path}`);
    if (!/@anthropic-ai\/sdk|anthropicClient\(/.test(source)) continue;
    assert.ok(
      AI_ROUTES.includes(`app/api/${path}`),
      `app/api/${path} talks to Anthropic but is not in the consent list in this test`,
    );
  }
});

test("the admin view of somebody's answers asks the consents table", () => {
  const source = read("app/api/admin/participants/[id]/route.ts");
  assert.match(source, /mayFounderRead\(/);
  assert.doesNotMatch(source, /consent_founder_access/);
});

test("consent rows are written on the server only", () => {
  // Row-level security allows reading your own history and nothing else, so a
  // tick in the browser cannot invent a consent that was never given.
  const sql = readFileSync(new URL("../supabase/2026-10-18-consents.sql", import.meta.url), "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select using \(auth\.uid\(\) = user_id\)/);
  assert.doesNotMatch(sql, /for insert/);
  // And the table cannot be rewritten after the fact.
  assert.match(sql, /before update on public\.consents/);
});
