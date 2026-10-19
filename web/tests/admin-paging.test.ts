import assert from "node:assert/strict";
import { test } from "node:test";
import { everyAccount } from "../src/lib/accounts.ts";

/*
 * Review round 4, concern 3: the overview asked Supabase for 1000 accounts in
 * one call. That is fine with five people and silently wrong at a thousand and
 * one, because the page comes back full and the overview simply leaves
 * everybody else out, with nothing on the screen to say so.
 */

/** A fake Supabase that hands out `total` accounts, 200 to a page. */
function fakeAdmin(total: number) {
  const calls: { page: number; perPage: number }[] = [];
  const admin = {
    auth: {
      admin: {
        listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
          calls.push({ page, perPage });
          const from = (page - 1) * perPage;
          const users = Array.from({ length: Math.max(0, Math.min(perPage, total - from)) }, (_, i) => ({
            id: `u${from + i}`,
            email: `person${from + i}@example.com`,
          }));
          return { data: { users }, error: null };
        },
      },
    },
  };
  return { admin: admin as never, calls };
}

test("a single short page is one call", async () => {
  const { admin, calls } = fakeAdmin(5);
  const users = await everyAccount(admin);
  assert.equal(users.length, 5);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].perPage, 200);
});

test("everybody past the first page is still in the overview", async () => {
  const { admin, calls } = fakeAdmin(407);
  const users = await everyAccount(admin);
  assert.equal(users.length, 407);
  assert.equal(calls.length, 3);
  // And nobody is counted twice.
  assert.equal(new Set(users.map((u) => u.id)).size, 407);
});

test("exactly one full page asks once more, and stops", async () => {
  const { admin, calls } = fakeAdmin(200);
  const users = await everyAccount(admin);
  assert.equal(users.length, 200);
  assert.equal(calls.length, 2);
});

test("no accounts at all is not an error", async () => {
  const { admin } = fakeAdmin(0);
  assert.deepEqual(await everyAccount(admin), []);
});

test("a failure is said out loud, not answered with a short list", async () => {
  const admin = {
    auth: { admin: { listUsers: async () => ({ data: null, error: { message: "network" } }) } },
  } as never;
  await assert.rejects(() => everyAccount(admin), /Could not read the accounts/);
});

test("past the cap it stops loudly rather than leaving people out", async () => {
  // 50 pages of 200. The next person after that would be invisible, so the
  // overview says so instead of drawing a list that is quietly incomplete.
  const { admin } = fakeAdmin(200 * 50 + 1);
  await assert.rejects(() => everyAccount(admin), /needs paging on the page itself/);
});
