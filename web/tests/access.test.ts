import assert from "node:assert/strict";
import { test } from "node:test";
import {
  closedBecause,
  isFreeAccount,
  itemAccess,
  lessonAccess,
  ownedSteps,
  pageAccess,
  stepAccess,
  type AccessConfig,
  type Entitlement,
} from "../src/lib/access.ts";

const config: AccessConfig = {
  products: {
    phase1: { name: "Phase 1", steps: [1, 2, 3] },
    full: { name: "Everything", steps: [1, 2, 3, 4, 5, 6, 7, 8] },
  },
  free: { items: ["introduction"], steps: [], pages: ["1.2"], lessons: ["step-1:p1"] },
};

const bought = (product: string, status: Entitlement["status"] = "active"): Entitlement[] => [{ product, status }];
const askFor = (entitlements: Entitlement[], requirePurchase: boolean, released = true) => ({ released, entitlements, requirePurchase, config });
const none: Entitlement[] = [];

test("what a product adds up to", () => {
  assert.deepEqual(ownedSteps(bought("phase1"), config), [1, 2, 3]);
  assert.deepEqual(ownedSteps(bought("full"), config), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(ownedSteps(none, config), []);
  // Upgrading leaves both rows in place; the steps must not be counted twice.
  assert.deepEqual(ownedSteps([...bought("phase1"), ...bought("full")], config), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("a refund or a revoke ends it", () => {
  assert.deepEqual(ownedSteps(bought("phase1", "refunded"), config), []);
  assert.deepEqual(ownedSteps(bought("phase1", "revoked"), config), []);
  assert.deepEqual(ownedSteps([{ product: "unknown-product", status: "active" }], config), [], "a product we do not know opens nothing");
});

// The one rule that protects everybody using the app today: until buying
// exists, a signed-in person may open anything released.
test("with buying switched off, nothing is taken away", () => {
  const v = stepAccess(1, askFor(none, false, true));
  assert.deepEqual(v, { open: true, because: "owned" });
});

test("released is asked before bought, so a closed step says the right thing", () => {
  // Step 2 is written but closed (journey.json), Step 1 is open.
  assert.deepEqual(stepAccess(2, askFor(bought("full"), true, false)), {
    open: false,
    why: "not-released",
  });
  assert.deepEqual(stepAccess(1, askFor(bought("phase1"), true, true)), {
    open: true,
    because: "owned",
  });
  assert.deepEqual(stepAccess(1, askFor(none, true, true)), {
    open: false,
    why: "not-bought",
  });
});

test("a free page opens inside a step nobody bought", () => {
  const free = pageAccess("1.2", 1, askFor(none, true, true));
  assert.deepEqual(free, { open: true, because: "free" });

  const paid = pageAccess("1.1", 1, askFor(none, true, true));
  assert.deepEqual(paid, { open: false, why: "not-bought" });

  // ...but not in a step that is not released at all.
  assert.deepEqual(pageAccess("1.2", 2, askFor(none, true, false)), {
    open: false,
    why: "not-released",
  });
});

test("every closed door has a sentence for the person", () => {
  assert.match(closedBecause("not-released"), /not open yet/i);
  assert.match(closedBecause("not-bought"), /Phase 1/);
});

// Free access is what someone gets for signing up without buying (§6.2): the
// Introduction, the Ordinary Tuesday, and one video so they meet Mwata first.
test("free access opens exactly what access.json says, and nothing beside it", () => {
  const ask = askFor(none, true);

  assert.deepEqual(itemAccess("introduction", { entitlements: none, requirePurchase: true, config }), {
    open: true,
    because: "free",
  });
  assert.deepEqual(pageAccess("1.2", 1, ask), { open: true, because: "free" });
  assert.deepEqual(lessonAccess("step-1", "p1", 1, ask), { open: true, because: "free" });

  // Everything else in the same step stays shut.
  assert.deepEqual(pageAccess("1.3", 1, ask), { open: false, why: "not-bought" });
  assert.deepEqual(lessonAccess("step-1", "p2", 1, ask), { open: false, why: "not-bought" });
  assert.deepEqual(stepAccess(1, ask), { open: false, why: "not-bought" });
});

test("a free lesson in a step that is not released is still shut", () => {
  // Nothing may open before its content exists, free or bought.
  assert.deepEqual(lessonAccess("step-1", "p1", 1, askFor(none, true, false)), {
    open: false,
    why: "not-released",
  });
});

test("buying the phase opens the free things too, without saying free", () => {
  const ask = askFor(bought("phase1"), true);
  assert.deepEqual(lessonAccess("step-1", "p2", 1, ask), { open: true, because: "owned" });
  assert.deepEqual(pageAccess("1.3", 1, ask), { open: true, because: "owned" });
});

// Which screens thin themselves out hangs on this one answer, so it is worth
// being sure it can never be true by accident.
test("a free account is someone signed in who has bought nothing", () => {
  assert.equal(isFreeAccount({ entitlements: none, requirePurchase: true, config }), true);
  assert.equal(isFreeAccount({ entitlements: bought("phase1"), requirePurchase: true, config }), false);
});

test("nobody is free while buying is switched off", () => {
  // Otherwise the app would thin itself out for everyone who has ever used it.
  assert.equal(isFreeAccount({ entitlements: none, requirePurchase: false, config }), false);
});

test("a refunded purchase makes a free account again", () => {
  assert.equal(isFreeAccount({ entitlements: bought("phase1", "refunded"), requirePurchase: true, config }), true);
});
