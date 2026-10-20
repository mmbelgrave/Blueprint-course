/*
 * Who may open /admin. One address is the normal case; a list is for moving
 * the admin from one address to another without a gap in between (Mwata,
 * 20 October). The parsing is what stands between a stray space in an
 * environment variable and nobody being admin at all.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { adminEmails } from "../src/lib/admin-emails.ts";

const withEnv = (value: string | undefined, run: () => void) => {
  const before = process.env.ADMIN_EMAIL;
  if (value === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = value;
  try {
    run();
  } finally {
    if (before === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = before;
  }
};

test("one address, with whatever spacing it was pasted with", () => {
  withEnv(" Info@MadeRealBlueprint.com ", () => {
    assert.deepEqual(adminEmails(), ["info@maderealblueprint.com"]);
  });
});

test("two addresses while the admin moves from one to the other", () => {
  withEnv("info@maderealblueprint.com, mmbelgrave@hotmail.com", () => {
    assert.deepEqual(adminEmails(), ["info@maderealblueprint.com", "mmbelgrave@hotmail.com"]);
  });
});

test("nothing set is nobody, not everybody", () => {
  withEnv(undefined, () => assert.deepEqual(adminEmails(), []));
  withEnv("", () => assert.deepEqual(adminEmails(), []));
  withEnv(" , ", () => assert.deepEqual(adminEmails(), []));
});
