import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanSource, MAX_SOURCE, sourceLabel } from "../src/lib/signup-source.ts";

// `?from=` is typed by whoever shares the link, so it is cleaned before it is
// ever written to the database or drawn on an Admin screen.
test("where someone came from is a short plain word, or nothing", () => {
  assert.equal(cleanSource("instagram"), "instagram");
  assert.equal(cleanSource("  Website  "), "website");
  assert.equal(cleanSource("news_letter-2"), "news_letter-2");
});

test("anything that could do harm does not survive", () => {
  assert.equal(cleanSource("<script>alert(1)</script>"), "scriptalert1script");
  assert.equal(cleanSource("'; drop table profiles; --"), "droptableprofiles--");
  assert.equal(cleanSource("../../etc/passwd"), "etcpasswd");
  assert.equal(cleanSource("!!!"), null, "nothing left means nothing stored");
});

test("nothing at all is a fine answer", () => {
  assert.equal(cleanSource(null), null);
  assert.equal(cleanSource(undefined), null);
  assert.equal(cleanSource(""), null);
  assert.equal(cleanSource("   "), null);
});

test("a very long one is cut, not refused", () => {
  const long = "a".repeat(200);
  assert.equal(cleanSource(long)?.length, MAX_SOURCE);
});

test("Admin says 'not known' rather than showing an empty box", () => {
  assert.equal(sourceLabel(null), "not known");
  assert.equal(sourceLabel("Instagram"), "instagram");
});
