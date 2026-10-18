/**
 * Withdrawing from the contract (Terms §9).
 *
 * The law gives a consumer 14 days to walk away from a distance purchase,
 * without a reason, and the full price back. The app's job is to make that one
 * button rather than an email somebody has to compose, and to put the date and
 * time of the request beyond argument.
 *
 * Three decisions are written into these rules, all Mwata's (18 October):
 *
 *   1. The refund is always the full price, in both windows.
 *   2. Access ends three working days after the request, not at once and not
 *      when the money arrives. Three days is a grace period for somebody who
 *      changes their mind, and it means nobody loses their answers the second
 *      they press a button.
 *   3. The refund itself stays manual in Lemon Squeezy, so the app never holds
 *      a payment key.
 *
 * Nothing here touches a database or the network, so the rules can be read and
 * tested on their own.
 */

/** How long the law gives, counted in whole days from the day of purchase. */
export const WITHDRAWAL_DAYS = 14;

/** The owner's own guarantee, beyond the legal right. */
export const GUARANTEE_DAYS = 30;

/** How long access lasts after a withdrawal is confirmed. */
export const GRACE_WORKING_DAYS = 3;

const DAY = 24 * 60 * 60 * 1000;

/** Midnight of that day, so a comparison is about days rather than hours. */
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Whole days between two days, ignoring the time of day. */
export function daysBetween(from: Date | string, to: Date | string): number {
  const a = startOfDay(new Date(from));
  const b = startOfDay(new Date(to));
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

export type Window = "withdrawal" | "guarantee" | "closed";

/**
 * Which window a purchase is in.
 *
 * Day 0 is the day of the purchase, so day 14 is still inside the legal
 * right: the period runs for fourteen days from the day after, and counting
 * the purchase day as day 0 gives the buyer the benefit of the doubt on the
 * last day rather than taking it away.
 */
export function windowFor(boughtAt: Date | string, now: Date | string = new Date()): Window {
  const days = daysBetween(boughtAt, now);
  if (days < 0) return "withdrawal";
  if (days <= WITHDRAWAL_DAYS) return "withdrawal";
  if (days <= GUARANTEE_DAYS) return "guarantee";
  return "closed";
}

/** Saturday or Sunday. Portuguese public holidays are not counted: see below. */
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/**
 * When access ends after a request.
 *
 * Three working days, counting only weekends out. Public holidays are
 * deliberately not in here: a holiday would make access end a day later than
 * the email said, and a promise that is easy to check beats one that is
 * perfectly exact. If that ever changes, the list belongs in one place and the
 * email must read from the same function.
 */
export function accessEndsAt(requestedAt: Date | string, days = GRACE_WORKING_DAYS): Date {
  const end = new Date(requestedAt);
  let left = days;
  while (left > 0) {
    end.setUTCDate(end.getUTCDate() + 1);
    if (!isWeekend(end)) left -= 1;
  }
  return end;
}

/** Has the grace period run out for a request that is still waiting? */
export const accessIsOver = (endsAt: Date | string, now: Date | string = new Date()) =>
  new Date(now).getTime() >= new Date(endsAt).getTime();

export type Order = {
  orderId: string | null;
  email: string | null;
  product: string;
  status: string;
  amountCents: number | null;
  currency: string | null;
  boughtAt: string;
};

export type Refusal = { ok: false; why: string };
export type Allowed = { ok: true; window: Exclude<Window, "closed"> };

/**
 * May this order be withdrawn from, and what should the person be told?
 *
 * Every refusal is a sentence somebody reads, so each one says what to do
 * next rather than only what went wrong.
 */
export function mayWithdraw(order: Order | null, now: Date | string = new Date()): Allowed | Refusal {
  if (!order) {
    return {
      ok: false,
      why: "We cannot find that order. Check the order number and the email address you paid with, both on your receipt from Lemon Squeezy.",
    };
  }
  if (order.status === "refunded") {
    return { ok: false, why: "That order has already been refunded. Nothing more is needed." };
  }
  if (order.status === "revoked") {
    return { ok: false, why: "That order is already closed. Email info@maderealblueprint.com and we will look at it." };
  }
  const where = windowFor(order.boughtAt, now);
  if (where === "closed") {
    return {
      ok: false,
      why: "The 14 days and the 30-day guarantee have both passed. Email info@maderealblueprint.com anyway and tell us what happened.",
    };
  }
  return { ok: true, window: where };
}

/** The same address, however it was typed. */
export const sameEmail = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

const money = (cents: number | null, currency: string | null) =>
  cents === null ? "the price you paid" : `${currency === "USD" ? "$" : "€"}${(cents / 100).toFixed(2)}`;

const when = (at: Date | string) =>
  new Date(at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });

const day = (at: Date | string) => new Date(at).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" });

/**
 * The letter the buyer gets, which is the law's "confirmation without delay".
 *
 * It states the date and the time, because that is what the confirmation is
 * for, and it says plainly what happens next so nobody has to ask.
 */
export function withdrawalMail(o: {
  orderId: string | null;
  amountCents: number | null;
  currency: string | null;
  requestedAt: Date | string;
  endsAt: Date | string;
}) {
  const text = [
    "Hello,",
    "",
    `We received your withdrawal from the contract on ${when(o.requestedAt)} UTC${
      o.orderId ? `, for order ${o.orderId}` : ""
    }.`,
    "",
    `You do not have to do anything else. We refund ${money(o.amountCents, o.currency)} in full, to the`,
    "payment method you used, within 14 days.",
    "",
    `Your access to the app ends on ${day(o.endsAt)}, three working days from now, so`,
    "you have a little time in case you change your mind. If you do, reply to this",
    "email before then.",
    "",
    "Mwata",
    "The Made Real Blueprint",
  ].join("\n");
  return { subject: "Your withdrawal from The Made Real Blueprint", text };
}

/** The note to Mwata, which exists to make the refund happen the same day. */
export function withdrawalNotice(o: {
  orderId: string | null;
  email: string;
  amountCents: number | null;
  currency: string | null;
  endsAt: Date | string;
}) {
  const text = [
    `${o.email} has withdrawn from the contract.`,
    "",
    `Order: ${o.orderId ?? "(no order number)"}`,
    `Refund in full: ${money(o.amountCents, o.currency)}`,
    `Their access ends on ${day(o.endsAt)}.`,
    "",
    "Refund it in Lemon Squeezy. The app ends the access on its own, and marks",
    "the request done when the refund arrives.",
  ].join("\n");
  return { subject: `Withdrawal: ${o.email}`, text };
}
