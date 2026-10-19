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

const read = (path: string) =>
  readFileSync(new URL(path.startsWith("../") ? `../${path.slice(3)}` : `../src/${path}`, import.meta.url), "utf8");

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

/*
 * Withdrawal, after the legal review of 18 October. The rule that matters is
 * that the endpoint never refuses a withdrawal, which is a property of the
 * route rather than of any function, so it is read here.
 */
test("the withdrawal route accepts the request whatever it is", () => {
  const source = read("app/api/withdraw/route.ts");
  // The only refusals allowed are a broken request, a missing email address,
  // too many requests, and our own failure to save it. Not "we cannot find
  // that order", which was the shape of yesterday's version.
  const refusals = [...source.matchAll(/fail\((\d{3}),/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
  assert.deepEqual([...new Set(refusals)], [400, 429, 500, 503]);
  assert.doesNotMatch(source, /fail\(404/, "a withdrawal is never refused for not matching a purchase");
  assert.doesNotMatch(source, /mayWithdraw\(/, "the window decides the sentence, not whether the button works");
});

test("no withdrawal or consent record keeps an IP address", () => {
  // Point 4 of the review: these two tables hold what somebody agreed to and
  // what they asked for, and nothing about the machine they did it from.
  for (const path of ["app/api/withdraw/route.ts", "app/api/consent/route.ts"]) {
    const source = read(path);
    assert.doesNotMatch(source, /x-forwarded-for|x-real-ip|request\.ip/i, `${path} reaches for an IP address`);
  }
  for (const sql of ["2026-10-19-withdrawals.sql", "2026-10-18-consents.sql"]) {
    const text = readFileSync(new URL(`../supabase/${sql}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /\bip_address\b|\binet\b/, `${sql} has a column for an IP address`);
  }
});

test("the order record outlives the account", () => {
  // "Delete everything" deletes the account. The purchase is what a refund
  // argument turns on, so it stays, with the person detached from it.
  const sql = readFileSync(new URL("../supabase/2026-10-19-withdrawals.sql", import.meta.url), "utf8");
  assert.match(sql, /alter table public\.entitlements alter column user_id drop not null/);
  assert.match(sql, /references auth\.users \(id\) on delete set null/);
});


test("every build checks that the workbook is not in a public file", () => {
  // R4-1 put the whole of Step 1 in a public chunk; R5-5 found the old chunk
  // still being served a round later. The script is what stops it coming
  // back, and this is what stops the script being quietly unhooked.
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(pkg.scripts.postbuild ?? "", /check-public-bundle/);
  assert.match(read("../scripts/check-public-bundle.mjs"), /process\.exit\(1\)/);
});

/*
 * R7-1 and R7-2, review round 7. Two rules that live in routes rather than in
 * a function, so they are read here.
 */
test("a withdrawal only ends access when somebody proved it is theirs", () => {
  const source = read("app/api/withdraw/route.ts");
  // The one place that writes an end date on a purchase.
  const writes = [...source.matchAll(/update\(\{ ended_at[^}]*\}\)/g)];
  assert.ok(writes.length > 0, "nothing ends access any more");
  assert.match(source, /provesOwnership\(/);
  // Both writes sit behind the proof, which is what `endsAt` carries.
  assert.doesNotMatch(
    source,
    /const endsAt = found && found\.row\.status === "active"/,
    "endsAt is back to following a bare email match",
  );
});

test("giving a purchase back closes the withdrawal with it", () => {
  // Otherwise the next sweep revokes it again and deletes the account thirty
  // days later, and "reply if you change your mind" is a promise nobody can
  // keep.
  const admin = read("app/api/admin/entitlements/route.ts");
  assert.match(admin, /from\("withdrawals"\)[\s\S]{0,200}status: "cancelled"/);
  const sweep = read("app/api/retention/route.ts");
  assert.match(sweep, /live\.status === "active" && !live\.ended_at/);
});
