/*
 * The webhook's rules (spec §6.1). Everything here decides whether somebody
 * gets the course they paid for, or whether a stranger gets it for nothing, so
 * it is tested on its own, away from the database and the network.
 */
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  decideAccess,
  productFor,
  readOrder,
  verifySignature,
  purchaseMail,
  type Order,
} from "../src/lib/lemonsqueezy.ts";
import { TERMS_VERSIONS, termsFor } from "../src/lib/terms-versions.ts";

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
        first_order_item: { variant_id: 776001, product_id: 1425209, product_name: "Phase 1 · Choose it" },
        ...attrs,
      },
    },
  });

const config = { variants: { phase1: "1425209,1407083", full: "776002" }, allowTestOrders: false };
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

test("the shop's own numbers open the product they were configured for", () => {
  const ids = (variantId: string, productId = "") => ({ variantId, productId });
  // The live shop and the test shop hold the same product under different
  // numbers, so one setting lists both.
  assert.equal(productFor(ids("776001", "1425209"), config.variants), "phase1", "the live product id");
  assert.equal(productFor(ids("991234", "1407083"), config.variants), "phase1", "the test product id");
  assert.equal(productFor(ids("776002"), config.variants), "full", "a variant id works too");
  assert.equal(productFor(ids("999999", "999999"), config.variants), undefined, "an unknown number is not guessed at");
  assert.equal(productFor(ids("776001", "1425209"), {}), undefined, "nothing configured opens nothing");
  assert.equal(
    productFor(ids("", ""), { phase1: "1425209" }),
    undefined,
    "an order with no numbers at all matches nothing",
  );
  assert.equal(
    productFor(ids("x", "1407083"), { phase1: " 1425209 , 1407083 " }),
    "phase1",
    "spaces around the numbers are forgiven",
  );
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

test("a product we do not know opens nothing, and says which one", () => {
  const raw = payload({}, { first_order_item: { variant_id: 123456, product_id: 987654 } });
  const d = decideAccess(orderOf(raw), "live", config);
  assert.equal(d.act, "ignore");
  const because = d.act === "ignore" ? d.because : "";
  // Both numbers are in the note on purpose: that note is how somebody finds
  // out what to put in the setting, without going near the API.
  assert.match(because, /987654/, "the product id");
  assert.match(because, /123456/, "and the variant id");
});

test("an event we do not handle is left alone", () => {
  const raw = payload({ event_name: "subscription_created" });
  assert.equal(decideAccess(orderOf(raw), "live", config).act, "ignore");
});

/* ───────────────────── the purchase confirmation ──────────────────────── */

/*
 * The lawyer's own words, which is why this test reads like a transcript:
 * what it confirms is that nothing was quietly reworded, and that nothing
 * invites the buyer to sign in with anything but a code they ask for.
 */
test("the confirmation says who sold what, for how much, and how to get out of it", () => {
  const { subject, text } = purchaseMail({
    name: "Anna de Vries",
    orderRef: "MRB-1042",
    boughtOn: "24 October 2026",
    paid: "EUR 99.00 including VAT",
    termsVersion: "24 October 2026",
  });
  assert.equal(subject, "Your purchase: The Made Real Blueprint, Phase 1 (order MRB-1042)");
  assert.match(text, /^Hello Anna,/, "their first name, not their full name");
  assert.match(text, /Belgrave Management, Unipessoal Lda/);
  assert.match(text, /NIPC 518428338/);
  assert.match(text, /EUR 99\.00 including VAT, one payment\. Order MRB-1042, 24 October 2026\./);
  assert.match(text, /Your access lasts at least three years from today\./);
  assert.match(text, /withdraw within 14 days of today, without giving a/);
  assert.match(text, /30-day money-back guarantee/);
  assert.match(text, /The terms are attached \(version of 24 October 2026\)/);
  assert.ok(!/token=|your code is/i.test(text), "no sign-in link and no code (§3.1)");
});

test("no name, no price and no attachment still make a letter", () => {
  const { text } = purchaseMail({ name: "", orderRef: "9762789", boughtOn: "15 October 2026", paid: null, termsVersion: null });
  assert.match(text, /^Hello,/);
  assert.match(text, /EUR 99 including VAT, one payment\. Order 9762789, 15 October 2026\./);
  assert.match(text, /^The terms are at https:\/\/maderealblueprint\.com\/terms\.$/m, "no promise of an attachment that is not there");
});

/* The dated copies: one for every version, and no version without a copy. */
test("every version of the terms has its file, and every file its version", () => {
  const listed = TERMS_VERSIONS.map((t) => t.file).sort();
  const onDisk = readdirSync("public/terms")
    .filter((f) => f.endsWith(".pdf"))
    .sort();
  assert.deepEqual(listed, onDisk);
  for (const t of TERMS_VERSIONS) {
    assert.ok(statSync(`public/terms/${t.file}`).size > 10_000, `${t.file} looks empty`);
  }
});

test("a purchase gets the version that applied on the day", () => {
  assert.equal(termsFor("2026-10-24")?.version, "24 October 2026");
  assert.equal(termsFor("2027-03-01")?.version, "24 October 2026");
  assert.equal(termsFor("2026-10-15"), null, "before the first copy was kept");
});
