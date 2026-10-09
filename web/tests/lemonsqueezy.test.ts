/*
 * The webhook's rules (spec §6.1). Everything here decides whether somebody
 * gets the course they paid for, or whether a stranger gets it for nothing, so
 * it is tested on its own, away from the database and the network.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  decideAccess,
  productFor,
  readOrder,
  verifySignature,
  welcomeMail,
  type Order,
} from "../src/lib/lemonsqueezy.ts";

const LIVE = "live-secret";
const TEST = "test-secret";
const sign = (raw: string, secret: string) => createHmac("sha256", secret).update(raw, "utf8").digest("hex");

const payload = (over: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) =>
  JSON.stringify({
    meta: { event_name: "order_created", test_mode: false, ...over },
    data: {
      id: "92100",
      attributes: {
        identifier: "MRB-1042",
        user_name: "Anna de Vries",
        user_email: "Anna@Example.com",
        currency: "EUR",
        total: 9900,
        test_mode: false,
        refunded: false,
        first_order_item: { variant_id: 776001, product_name: "Phase 1 · Choose it" },
        ...attrs,
      },
    },
  });

const config = { variants: { phase1: "776001", full: "776002" }, allowTestOrders: false };
const orderOf = (raw: string): Order => {
  const r = readOrder(JSON.parse(raw));
  assert.ok(!("error" in r), "error" in r ? r.error : "");
  return (r as { order: Order }).order;
};

/* ───────────────────────────── the signature ──────────────────────────── */

test("a correctly signed body says which secret signed it", () => {
  const raw = payload();
  assert.equal(verifySignature(raw, sign(raw, LIVE), { live: LIVE, test: TEST }), "live");
  assert.equal(verifySignature(raw, sign(raw, TEST), { live: LIVE, test: TEST }), "test");
});

test("nothing else gets in", () => {
  const raw = payload();
  const secrets = { live: LIVE, test: TEST };
  assert.equal(verifySignature(raw, null, secrets), null, "no signature at all");
  assert.equal(verifySignature(raw, "", secrets), null, "an empty signature");
  assert.equal(verifySignature(raw, sign(raw, "someone else"), secrets), null, "the wrong secret");
  assert.equal(verifySignature(raw, "not hex at all", secrets), null, "not a digest");
  assert.equal(verifySignature(raw, sign(raw, LIVE).slice(0, 40), secrets), null, "a truncated digest");
  assert.equal(verifySignature(`${raw} `, sign(raw, LIVE), secrets), null, "a body changed by one space");
  assert.equal(verifySignature(raw, sign(raw, LIVE), {}), null, "no secrets configured");
});

test("the test secret alone cannot open the live app", () => {
  // Only the test secret is configured, which is the state of a shop that has
  // never gone live. A live order must not be let through on it.
  const raw = payload();
  const signedWith = verifySignature(raw, sign(raw, TEST), { test: TEST });
  assert.equal(signedWith, "test");
  const d = decideAccess(orderOf(raw), signedWith!, config);
  assert.equal(d.act, "ignore");
});

/* ──────────────────────────── reading the order ───────────────────────── */

test("the fields we need, out of the payload they send", () => {
  const o = orderOf(payload());
  assert.equal(o.orderId, "92100");
  assert.equal(o.reference, "MRB-1042");
  assert.equal(o.email, "anna@example.com", "the address is lower-cased, so it matches an account");
  assert.equal(o.name, "Anna de Vries");
  assert.equal(o.variantId, "776001");
  assert.equal(o.totalCents, 9900);
  assert.equal(o.currency, "EUR");
  assert.equal(o.testMode, false);
});

test("a payload we cannot act on is refused, not half-written", () => {
  const missing = (attrs: Record<string, unknown>) => readOrder(JSON.parse(payload({}, attrs)));
  assert.ok("error" in missing({ user_email: "" }), "no email");
  assert.ok("error" in missing({ user_email: "not an address" }), "not an email");
  assert.ok("error" in missing({ first_order_item: {} }), "no variant");
  assert.ok("error" in readOrder({}), "nothing at all");
  assert.ok("error" in readOrder(null), "null");
});

test("test mode is believed from either place it is written", () => {
  assert.equal(orderOf(payload({ test_mode: true })).testMode, true, "from meta");
  assert.equal(orderOf(payload({}, { test_mode: true })).testMode, true, "from the order");
});

/* ─────────────────────────────── what it means ────────────────────────── */

test("a variant opens the product it was configured for, and nothing else", () => {
  assert.equal(productFor("776001", config.variants), "phase1");
  assert.equal(productFor("776002", config.variants), "full");
  assert.equal(productFor("999999", config.variants), undefined, "an unknown variant is not guessed at");
  assert.equal(productFor("776001", {}), undefined, "nothing configured opens nothing");
});

test("a paid order opens the phase", () => {
  assert.deepEqual(decideAccess(orderOf(payload()), "live", config), { act: "open", product: "phase1" });
});

test("a refund closes it", () => {
  const raw = payload({ event_name: "order_refunded" }, { refunded: true });
  assert.deepEqual(decideAccess(orderOf(raw), "live", config), { act: "close" });
});

test("a test order does not open the live app unless somebody said it may", () => {
  const raw = payload({ test_mode: true }, { test_mode: true });
  assert.equal(decideAccess(orderOf(raw), "test", config).act, "ignore");
  assert.deepEqual(decideAccess(orderOf(raw), "test", { ...config, allowTestOrders: true }), {
    act: "open",
    product: "phase1",
  });
});

test("the two modes must agree with each other", () => {
  const live = orderOf(payload());
  assert.equal(decideAccess(live, "test", config).act, "ignore", "a live order signed with the test secret");
  const testOrder = orderOf(payload({ test_mode: true }, { test_mode: true }));
  assert.equal(decideAccess(testOrder, "live", config).act, "ignore", "a test order signed with the live secret");
});

test("an unknown variant opens nothing, and says so", () => {
  const raw = payload({}, { first_order_item: { variant_id: 123456 } });
  const d = decideAccess(orderOf(raw), "live", config);
  assert.equal(d.act, "ignore");
  assert.match(d.act === "ignore" ? d.because : "", /123456/, "the number is in the note, so Admin can act on it");
});

test("an event we do not handle is left alone", () => {
  const raw = payload({ event_name: "subscription_created" });
  assert.equal(decideAccess(orderOf(raw), "live", config).act, "ignore");
});

/* ──────────────────────────── the welcome email ───────────────────────── */

test("the welcome email carries no code and no link to sign in with", () => {
  const { subject, text } = welcomeMail({
    name: "Anna de Vries",
    productName: "Phase 1 · Choose it",
    appUrl: "https://app.maderealblueprint.com",
    email: "anna@example.com",
  });
  assert.match(subject, /Phase 1/);
  assert.match(text, /Hello Anna,/, "their first name, not their full name");
  assert.match(text, /anna@example\.com/, "which address to sign in with");
  assert.ok(!/\/auth|token=|code is|your code/i.test(text), "no sign-in link and no code (§3.1)");
});

test("no name still makes a sentence", () => {
  const { text } = welcomeMail({ name: "", productName: "Phase 1", appUrl: "x", email: "a@b.c" });
  assert.match(text, /^Hello,/);
});
