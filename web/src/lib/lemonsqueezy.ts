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

/* ──────────────────────────── the welcome email ───────────────────────── */

/**
 * Sent once, when the order opens something. It carries no sign-in link and no
 * code: §3.1 says the email with the code is asked for by the person, at the
 * moment they want it, and never sent on anyone's behalf.
 */
export function welcomeMail(o: {
  name: string;
  productName: string;
  appUrl: string;
  email: string;
  /** False when this address already had an account — a Phase 1 buyer coming back. */
  isNew?: boolean;
}) {
  const hello = o.name ? `Hello ${o.name.split(" ")[0]},` : "Hello,";

  /*
   * Somebody coming back for the rest does not need the course explained to
   * them again. What they do need to hear is that everything they already
   * wrote is still there: that is what people worry about when they buy the
   * next part of something they have already started.
   */
  const middle =
    o.isNew === false
      ? [
          `Go to ${o.appUrl} and sign in as usual, with ${o.email}. Everything you have`,
          "already written is where you left it, and the new steps are simply open.",
        ]
      : [
          `Go to ${o.appUrl} and sign in with this email address — ${o.email}. There is no`,
          "password: you ask for a code, it arrives here, and you type it in.",
          "",
          "Inside you will find the videos, the workbook to download, and every exercise",
          "to answer in the app if you prefer. Your answers are saved as you write, and",
          "you can download all of them whenever you like.",
          "",
          "Take your time with it. Step 1 is not a form to fill in; it is the part where",
          "you work out what you actually want.",
        ];

  const text = [
    hello,
    "",
    `Thank you. ${o.productName} is open for you.`,
    "",
    ...middle,
    "",
    "Mwata",
    "The Made Real Blueprint",
  ].join("\n");

  return { subject: `${o.productName} is open — how to start`, text };
}
