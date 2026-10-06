import assert from "node:assert/strict";
import { test } from "node:test";
import { closedBecause, ownedSteps, pageAccess, stepAccess, type AccessConfig, type Entitlement } from "../src/lib/access.ts";

const config: AccessConfig = {
  products: {
    phase1: { name: "Phase 1", steps: [1, 2, 3] },
    full: { name: "Everything", steps: [1, 2, 3, 4, 5, 6, 7, 8] },
  },
  free: { items: ["introduction"], steps: [], pages: ["1.2"] },
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
