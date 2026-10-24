/**
 * What Lemon Squeezy sends us, and what it means (spec §6.1).
 *
 * Kept apart from the route and free of the database, so every awkward rule —
 * is this really from Lemon Squeezy, is this order one we have already seen,
 * does this variant mean Phase 1, is a test order allowed to open the live
 * app — can be read and tested on its own.
 *
 * Server-only in practice: nothing here reaches the browser. It imports only
 * node:crypto, so a test can run it without a network or a database.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/* ───────────────────────────── is it really them ──────────────────────── */

export type Mode = "live" | "test";
export type Secrets = Partial<Record<Mode, string | undefined>>;

/**
 * Lemon Squeezy signs the raw body with the webhook's signing secret and sends
 * the result as a hex digest in X-Signature.
 *
 * The body must be the bytes as they arrived: parsing and re-serialising the
 * JSON changes the whitespace and the signature no longer matches.
 *
 * Live and test have separate secrets, and we are told which mode an order is
 * in only by the body — which we cannot trust until it is verified. So each
 * configured secret is tried, and the one that matches tells us which it was.
 * A body claiming to be live but signed with the test secret is caught later,
 * in `decideAccess`.
 */
export function verifySignature(raw: string, signature: string | null, secrets: Secrets): Mode | null {
  if (!signature) return null;
  let given: Buffer;
  try {
    given = Buffer.from(signature, "hex");
  } catch {
    return null;
  }
  if (given.length !== 32) return null; // not a SHA-256 digest

  for (const mode of ["live", "test"] as Mode[]) {
    const secret = secrets[mode];
    if (!secret) continue;
    const expected = createHmac("sha256", secret).update(raw, "utf8").digest();
    if (timingSafeEqual(expected, given)) return mode;
  }
  return null;
}

/* ──────────────────────────── what they sent ──────────────────────────── */

export type Order = {
  event: string;
  /** The order's own id. Our key for "we have seen this one". */
  orderId: string;
  /** Readable, for Admin and the email: "MRB-1042". */
  reference: string;
  email: string;
  name: string;
  variantId: string;
  /** The product the variant belongs to. Visible in the dashboard address. */
  productId: string;
  productName: string;
  totalCents: number | null;
  currency: string | null;
  testMode: boolean;
  refunded: boolean;
};

type Unknown = Record<string, unknown>;
const obj = (v: unknown): Unknown => (v && typeof v === "object" ? (v as Unknown) : {});
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

/**
 * The few fields we need, out of a large payload. Anything missing that we
 * cannot do without is an error rather than an empty string, because writing
 * an entitlement with no email or no order id would be worse than refusing.
 */
export function readOrder(body: unknown): { order: Order } | { error: string } {
  const root = obj(body);
  const meta = obj(root.meta);
  const data = obj(root.data);
  const a = obj(data.attributes);
  const item = obj(a.first_order_item);

  const event = str(meta.event_name);
  if (!event) return { error: "No event name." };

  const orderId = str(data.id);
  if (!orderId) return { error: "No order id." };

  const email = str(a.user_email).trim().toLowerCase();
  if (!email.includes("@")) return { error: "No email on the order." };

  const variantId = str(item.variant_id);
  if (!variantId) return { error: "No variant on the order." };

  return {
    order: {
      event,
      orderId,
      reference: str(a.identifier) || str(a.order_number) || orderId,
      email,
      name: str(a.user_name).trim(),
      variantId,
      productId: str(item.product_id),
      productName: str(item.product_name) || str(item.variant_name),
      totalCents: typeof a.total === "number" ? a.total : null,
      currency: a.currency ? str(a.currency) : null,
      // meta says it too, and the two should agree; either one being true is
      // enough to treat it as a test.
      testMode: a.test_mode === true || meta.test_mode === true,
      refunded: a.refunded === true || event === "order_refunded",
    },
  };
}

/* ─────────────────────────── what it entitles ─────────────────────────── */

/**
 * Which Lemon Squeezy ids mean which of our products.
 *
 * One setting per product, holding a comma-separated list, because the same
 * product exists twice over there: once in the live shop and once in the test
 * shop, with different numbers. "1425209,1407083" covers both.
 *
 * A product id is as good as a variant id here. The dashboard shows the
 * product id in its own address and never shows the variant id at all, so
 * insisting on the variant would mean asking somebody to go and find a number
 * the website will not tell them.
 */
export type Variants = Record<string, string | undefined>;

export function productFor(
  ids: { variantId: string; productId: string },
  variants: Variants,
): string | undefined {
  for (const [product, configured] of Object.entries(variants)) {
    if (!configured) continue;
    const list = String(configured)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.includes(ids.variantId) || (ids.productId && list.includes(ids.productId))) return product;
  }
  return undefined;
}

export type Decision =
  | { act: "open"; product: string }
  | { act: "close" }
  | { act: "ignore"; because: string };

/**
 * What this message should do.
 *
 * A test order never opens anything in the live app unless somebody has
 * deliberately said it may (ALLOW_TEST_ORDERS), because the whole point of
 * test mode is that no money changed hands. It is still recorded, so Admin can
 * show that the webhook is wired up and working.
 *
 * A live order signed with the test secret is refused: the modes must agree,
 * or a test key would be enough to give away the course.
 */
export function decideAccess(
  order: Order,
  signedWith: Mode,
  config: { variants: Variants; allowTestOrders: boolean },
): Decision {
  if (order.testMode !== (signedWith === "test")) {
    return { act: "ignore", because: `A ${order.testMode ? "test" : "live"} order signed with the ${signedWith} secret.` };
  }
  if (order.event !== "order_created" && order.event !== "order_refunded") {
    return { act: "ignore", because: `Nothing to do for ${order.event}.` };
  }
  if (order.refunded) return { act: "close" };
  if (order.testMode && !config.allowTestOrders) {
    return { act: "ignore", because: "A test order, and test orders do not open the live app." };
  }

  const product = productFor(order, config.variants);
  if (!product) {
    // The numbers are in the note on purpose: this is how somebody finds out
    // what to configure, without going near the Lemon Squeezy API.
    return {
      act: "ignore",
      because: `Nothing is configured for product ${order.productId} (variant ${order.variantId}).`,
    };
  }
  return { act: "open", product };
}

/* ─────────────────────── the purchase confirmation ────────────────────── */

/**
 * The confirmation a buyer has to be given, on a durable medium, with the
 * terms of the day attached (lawyer, 24 October).
 *
 * Every word of it is the lawyer's. The only things filled in are the ones
 * that differ per buyer: their first name, the order, the day, what they
 * paid, and which version of the terms is attached. Nothing is added to it,
 * and nothing is left out: a sentence that does not fit is a question for
 * the lawyer, not an edit here.
 */
export function purchaseMail(o: {
  name: string;
  /** The order as the buyer sees it on their receipt. */
  orderRef: string;
  /** The day they bought, written out: "24 October 2026". */
  boughtOn: string;
  /** What they paid, written out: "EUR 99.00". Null when we do not know. */
  paid: string | null;
  /** The version of the terms attached, or null when none is attached. */
  termsVersion: string | null;
}) {
  const hello = o.name ? `Hello ${o.name.split(" ")[0]},` : "Hello,";
  const price = o.paid ?? "EUR 99 including VAT";
  const terms = o.termsVersion
    ? `The terms are attached (version of ${o.termsVersion}) and at https://maderealblueprint.com/terms.`
    : "The terms are at https://maderealblueprint.com/terms.";

  const text = [
    hello,
    "",
    "Thank you. This email confirms your purchase from Belgrave Management, Unipessoal Lda",
    "(The Life You Choose), NIPC 518428338, Rua Doutora Maria Adelaide Moura Ferreira, s/n,",
    "Passarela, 6290-093 Lagarinhos, Gouveia, Portugal, info@maderealblueprint.com.",
    "",
    "You bought: Phase 1 of The Made Real Blueprint (PDF workbooks for Steps 1 to 3 and",
    `access to the app). ${price}, one payment. Order ${o.orderRef}, ${o.boughtOn}.`,
    "",
    "Your access lasts at least three years from today. Sign in at app.maderealblueprint.com",
    "with this email address. You get a code by email.",
    "",
    "Your right to withdraw: you can withdraw within 14 days of today, without giving a",
    "reason, and we refund the full price. Use \"Withdraw from contract here\":",
    "https://app.maderealblueprint.com/withdraw. You can also email us, or use the model",
    "form in the terms. On top of that we have a 30-day money-back guarantee: email us with",
    "your order number.",
    "",
    terms,
    "Privacy: https://maderealblueprint.com/privacy.html.",
    "",
    "Mwata",
  ].join("\n");

  return { subject: `Your purchase: The Made Real Blueprint, Phase 1 (order ${o.orderRef})`, text };
}

