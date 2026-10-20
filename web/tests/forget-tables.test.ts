/*
 * "Delete everything I wrote" empties the tables that hold a person's own
 * writing and leaves the account standing. The danger is the next table:
 * somebody adds one keyed by user_id, and it quietly survives a deletion
 * nobody notices, because no screen shows it.
 *
 * So every table in the schema that belongs to a person has to be in one of
 * the two lists, and say which it is.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { KEPT_RECORDS, WRITTEN_BY_PERSON } from "../src/lib/forget-account.ts";

/** Every table in the SQL with a column pointing at a person. */
function tablesOfPeople() {
  const found = new Set<string>();
  for (const file of readdirSync("supabase").filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(`supabase/${file}`, "utf8");
    const tables = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
    let m: RegExpExecArray | null;
    while ((m = tables.exec(sql))) {
      const [, name, body] = m;
      if (/\b(user_id|buyer_id)\b[^,]*references auth\.users/.test(body)) found.add(name);
    }
  }
  return found;
}

test("every table that belongs to a person is either emptied or kept on purpose", () => {
  const written = new Set<string>(WRITTEN_BY_PERSON);
  for (const table of tablesOfPeople()) {
    const decided = written.has(table) || table in KEPT_RECORDS;
    assert.ok(decided, `${table} is keyed to a person and is in neither list`);
  }
});

test("nothing is in both lists", () => {
  for (const table of WRITTEN_BY_PERSON) {
    assert.ok(!(table in KEPT_RECORDS), `${table} cannot be emptied and kept`);
  }
});

/* The answers are the point of the whole thing. */
test("the writing itself is emptied", () => {
  for (const table of ["answers", "conversations", "ai_profile", "part_results", "private_pages", "profiles"]) {
    assert.ok((WRITTEN_BY_PERSON as readonly string[]).includes(table), `${table} has to be deleted`);
  }
  assert.ok(!(WRITTEN_BY_PERSON as readonly string[]).includes("entitlements"), "the course is not something they wrote");
});
