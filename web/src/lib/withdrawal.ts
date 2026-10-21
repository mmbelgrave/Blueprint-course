/**
 * Withdrawing from the contract (Terms §9, legal review of 18 October).
 *
 * The law gives a consumer 14 days to walk away from a distance purchase,
 * without a reason, and the full price back. The app's job is to make that one
 * button rather than an email somebody has to compose, and to put the date and
 * time of the request beyond argument.
 *
 * Four decisions are written into these rules, all Mwata's:
 *
 *   1. The refund is always the full price, in both windows.
 *   2. Access ends three days after the request, not at once and not when the
 *      money arrives. Three days is a grace period for somebody who changes
 *      their mind, and it means nobody loses their answers the second they
 *      press a button. Calendar days, not working days (19 October): a date
 *      anybody can count beats a date they have to work out.
 *   3. The page never refuses. A request outside both windows is still
 *      recorded and still answered; what changes is the sentence, not whether
 *      the button works.
 *   4. The refund itself stays manual in Lemon Squeezy, so the app never holds
 *      a payment key.
 *
 * Nothing here touches a database or the network, so the rules can be read and
 * tested on their own.
 */

/** How long the law gives, counted in whole days from the day of purchase. */
export const WITHDRAWAL_DAYS = 14;

/** The owner's own guarantee, beyond the legal right. */
export const GUARANTEE_DAYS = 30;

/** How long access lasts after a withdrawal is recorded. */
export const GRACE_DAYS = 3;

/** How long the trader has to pay the money back. */
export const REFUND_DAYS = 14;

/** How long the answers stay after access ends, unless asked sooner. */
export const DELETE_AFTER_ACCESS_DAYS = 30;

/** The clock the dates are stated in. */
export const HOME_ZONE = "Europe/Lisbon";

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

/** A zone's offset from UTC at that moment, in minutes. */
function zoneOffsetMinutes(at: Date, timeZone = HOME_ZONE): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name ?? "");
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** The calendar day in Lisbon, as YYYY-MM-DD. */
export function homeDay(at: Date | string, timeZone = HOME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(at),
  );
}

/**
 * When access ends after a request.
 *
 * Three days, and then the whole of that third day: access ends one second
 * before midnight at the end of it, in Lisbon. So the email can name a date
 * and be right about it for the whole of that day, whatever hour the request
 * came in, and the date it names is the last day that works rather than the
 * first day that does not.
 */
export function accessEndsAt(requestedAt: Date | string, days = GRACE_DAYS): Date {
  const [y, m, d] = homeDay(requestedAt).split("-").map(Number);
  // The last second of the third day, read as a Lisbon clock and turned back
  // into a real moment.
  const lastSecond = new Date(Date.UTC(y, m - 1, d + days) + DAY - 1000);
  return new Date(lastSecond.getTime() - zoneOffsetMinutes(lastSecond) * 60 * 1000);
}

/** The day the money has to be back by. */
export function refundDeadline(requestedAt: Date | string, days = REFUND_DAYS): Date {
  return new Date(new Date(requestedAt).getTime() + days * DAY);
}

/** Has the grace period run out? */
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

/** The same address, however it was typed. */
export const sameEmail = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

/**
 * What this person is promised, in one sentence they can hold us to.
 *
 * Both windows are a full refund, so the sentence differs only in which
 * promise it leans on. Outside both, nothing is refused: the request is
 * recorded and answered by a person.
 */
export function refundPromise(where: Window): string {
  if (where === "withdrawal") {
    return "You withdrew inside the 14 days, so we refund the full price you paid, to the payment method you used, within 14 days.";
  }
  if (where === "guarantee") {
    return "You are past the 14 days, and our own 30-day guarantee covers you, so we refund the full price you paid, to the payment method you used, within 14 days.";
  }
  return "You are past both the 14 days and our 30-day guarantee. We will look at your request and reply to you by email.";
}

const money = (cents: number | null, currency: string | null) =>
  cents === null ? "the price you paid" : `${currency === "USD" ? "$" : "€"}${(cents / 100).toFixed(2)}`;

const productName = (product: string | null) =>
  product === "full" ? "The Made Real Blueprint" : "Phase 1 of The Made Real Blueprint";

/** The moment, on the clock the person was looking at. */
export function whenIn(at: Date | string, timeZone: string | null): { text: string; zone: string } {
  const zone = timeZone || "UTC";
  try {
    return {
      text: new Date(at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: zone }),
      zone,
    };
  } catch {
    // A browser can send anything. An unknown zone must not lose the record.
    return {
      text: new Date(at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }),
      zone: "UTC",
    };
  }
}

const day = (at: Date | string) => new Date(at).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: HOME_ZONE });

export type Receipt = {
  /** True when the asker proved the purchase is theirs (R7-1). */
  verified?: boolean;
  /** Their own words, when we asked and they wrote something. */
  reason?: string | null;
  email: string;
  name: string | null;
  orderEntered: string | null;
  matchedOrder: string | null;
  product: string | null;
  amountCents: number | null;
  currency: string | null;
  requestedAt: Date | string;
  timeZone: string | null;
  endsAt: Date | string | null;
  window: Window;
};

/**
 * The letter the buyer gets, which is the law's "confirmation without delay".
 *
 * It repeats what they typed, states the minute on their own clock and in UTC,
 * and says what happens next, so nobody has to ask and nobody has to keep a
 * screenshot.
 */
export function withdrawalMail(r: Receipt) {
  const local = whenIn(r.requestedAt, r.timeZone);
  const utc = whenIn(r.requestedAt, "UTC");
  /*
   * A request we could not match to a purchase gets a conditional promise.
   * Saying "we refund the full price you paid" to somebody whose address
   * bought nothing is a promise about a purchase we cannot see, and the next
   * paragraph admits we could not find it.
   */
  const promise = r.endsAt || r.matchedOrder
    ? refundPromise(r.window)
    : "If this address bought the course, we refund the full price you paid, to the payment method you used, within 14 days.";
  const lines = [
    r.name ? `Hello ${r.name},` : "Hello,",
    "",
    `You withdrew from the contract for ${productName(r.product)}.`,
    "",
    `We received it on ${local.text} (${local.zone}), which is ${utc.text} UTC.`,
    "",
    "What you told us:",
    `  Email: ${r.email}`,
    `  Order number: ${r.orderEntered || "(not given)"}`,
    `  Name: ${r.name || "(not given)"}`,
    "",
    promise,
    `${r.amountCents === null ? "" : `That is ${money(r.amountCents, r.currency)}. `}You do not have to do anything else.`,
    "",
  ];

  if (r.endsAt) {
    lines.push(
      `Your access to the app ends on ${day(r.endsAt)}, three days from now, so you`,
      "have a little time in case you change your mind.",
      "",
      "Before that date, open My settings and download your workbook, so you keep",
      "everything you have written. Your answers are deleted 30 days after your",
      "access ends, or sooner if you ask us.",
      "",
    );
  } else if (r.matchedOrder) {
    // Matched, but nobody proved it was them: the letter is also the warning
    // to somebody whose address was typed in by another person.
    lines.push(
      "Your access has not changed yet. The request did not come from your",
      "signed-in account and did not carry your order number, so we have left",
      "everything as it is and will check it by hand.",
      "",
      "If this was you, reply with the order number from your Lemon Squeezy",
      "receipt, or sign in and ask again from My settings, and it goes through",
      "at once. If it was not you, reply and say so: nothing has been taken",
      "away, and we will stop it here.",
      "",
    );
  } else {
    lines.push(
      "We could not match your email address to a purchase, so no access has",
      "changed. We will look at it by hand and reply to you. If you have your",
      "order number from Lemon Squeezy, reply with it and it will be quicker.",
      "",
    );
  }

  lines.push(
    "Reply to this email if you change your mind, or if anything above is wrong.",
    "If you did not make this request, reply to this email and we will stop it.",
    "",
    "Mwata",
    "Belgrave Management, Unipessoal Lda",
    "info@maderealblueprint.com",
  );
  // The subject is the lawyer's (D1), so somebody searching their inbox for
  // the words the terms used finds this.
  return { subject: "We received your withdrawal", text: lines.join("\n") };
}

/** The note to Mwata, which exists to make the refund happen the same day. */
export function withdrawalNotice(r: Receipt) {
  const utc = whenIn(r.requestedAt, "UTC");
  const lines = [
    `${r.email} has withdrawn from the contract.`,
    "",
    `Received: ${utc.text} UTC`,
    `Name: ${r.name || "(not given)"}`,
    `Order number they typed: ${r.orderEntered || "(not given)"}`,
    `Order we matched: ${r.matchedOrder ?? "NONE - match this by hand"}`,
    `Refund in full: ${money(r.amountCents, r.currency)}`,
    `Refund due by: ${day(refundDeadline(r.requestedAt))}`,
    r.reason ? "" : null,
    r.reason ? `What they said did not work:` : null,
    r.reason ? r.reason : null,
    r.reason ? "" : null,
    r.endsAt
      ? `Their access ends on ${day(r.endsAt)}.`
      : r.matchedOrder
        ? "No access was ended: the request did not prove it came from them (no sign-in, no order number). Check it is really them, then end it from Admin."
        : "No access was ended, because nothing matched.",
    "",
    "Refund it in full in Lemon Squeezy. The app ends the access on its own and",
    "marks the request done when the refund webhook arrives.",
  ].filter((line) => line !== null);
  return { subject: `Withdrawal: ${r.email}`, text: lines.join("\n") };
}

/**
 * Whether to offer the box at all.
 *
 * Inside the 14 days the law is plain: the withdrawal needs no reason and we
 * do not ask for one, because a question in that place reads as a condition.
 * Afterwards it is our own guarantee, and the terms already invite a line or
 * two. Optional there, and it changes nothing either way.
 */
export const mayAskWhy = (window: Window): boolean => window !== "withdrawal";

/** One row of the entitlements table, as the withdrawal pages read it. */
export type Held = { id: number; status: string; source?: string | null; order_id?: string | null };

/**
 * Which of somebody's entitlements a withdrawal is about.
 *
 * A granted account is not a purchase: no order, no money, nothing to refund
 * and no contract to withdraw from. The two owner accounts hold one so that
 * every step is open to them without buying anything (Mwata, 21 October), and
 * the withdrawal page offered them a refund of nothing.
 *
 * Of what is left, the order number they typed decides, then any purchase
 * that is still open, then the most recent one. A typed number that matches
 * nothing is ignored rather than fatal: it was only ever a way of choosing
 * between several, never the thing that proves anything.
 */
export function purchaseRow<T extends Held>(rows: T[], orderEntered?: string | null): T | null {
  const bought = rows.filter((r) => r.source !== "granted");
  if (!bought.length) return null;
  const typed = orderEntered?.trim();
  return (
    (typed ? bought.find((r) => r.order_id === typed) : undefined) ??
    bought.find((r) => r.status === "active") ??
    bought[0]
  );
}

/** The words above the box, so the screen and the record cannot drift apart. */
export const WHY_LABEL = "If you like, tell us what did not work (optional)";
export const WHY_NOTE =
  "After the 14 days this is our own 30-day guarantee rather than the legal right to withdraw. A line or two helps me make the course better. Your refund does not depend on it, and you can leave this empty.";

/** The nudge on day seven, when the money has still not gone back. */
export function reminderMail(r: {
  email: string;
  matchedOrder: string | null;
  amountCents: number | null;
  currency: string | null;
  requestedAt: Date | string;
}) {
  const due = refundDeadline(r.requestedAt);
  const left = Math.max(0, daysBetween(new Date(), due));
  const text = [
    `${r.email} withdrew on ${day(r.requestedAt)} and the refund has not arrived yet.`,
    "",
    `Order: ${r.matchedOrder ?? "(not matched)"}`,
    `Refund in full: ${money(r.amountCents, r.currency)}`,
    `Due by: ${day(due)}, which is ${left} day${left === 1 ? "" : "s"} away.`,
    "",
    "Refund it in Lemon Squeezy today. The law gives 14 days from the request,",
    "and this is day seven.",
  ].join("\n");
  return { subject: `Refund still due: ${r.email}`, text };
}

export type OpenWithdrawal = {
  status: string;
  requested_at: string;
  access_ends_at: string | null;
  reminded_at: string | null;
  data_deleted_at: string | null;
  user_id: string | null;
};

/** What the daily sweep should do about one withdrawal, in any combination. */
export type SweepAct = "revoke" | "remind" | "delete-data";

/** The day the owner is nudged if the money has still not gone back. */
export const REMIND_ON_DAY = 7;

/**
 * What is due on this withdrawal today.
 *
 * Three jobs, each one idempotent on its own:
 *
 *   revoke       the three days are up, so the purchase is closed. Access has
 *                already stopped on its own, because the access rules read
 *                `ended_at`; this only makes the row say what is true.
 *   remind       day seven and the refund has not arrived. The law gives 14
 *                days for the money, and nobody should find that out on day 13.
 *   delete-data  thirty days after access ended, the answers go. Mwata's
 *                decision of 19 October, and the confirmation email says so.
 *
 * A withdrawal somebody took back ('cancelled') is left entirely alone.
 */
export function sweepActs(w: OpenWithdrawal, now: Date | string = new Date()): SweepAct[] {
  if (w.status === "cancelled") return [];
  const acts: SweepAct[] = [];

  if (w.status === "received" && !w.reminded_at && daysBetween(w.requested_at, now) >= REMIND_ON_DAY) {
    acts.push("remind");
  }
  if (w.access_ends_at && accessIsOver(w.access_ends_at, now)) {
    acts.push("revoke");
    if (
      w.user_id &&
      !w.data_deleted_at &&
      daysBetween(w.access_ends_at, now) >= DELETE_AFTER_ACCESS_DAYS
    ) {
      acts.push("delete-data");
    }
  }
  return acts;
}

/**
 * Did this request prove the purchase belongs to the person asking?
 *
 * Review round 7 (R7-1): anybody can type anybody's address into the public
 * page, so an address on its own proves nothing. Recording the request is
 * still right, and the owner of the address still gets the letter. What may
 * not follow from an unproved request is ending somebody's access.
 *
 * Two things prove it: a session on the account that owns the purchase, or
 * the order number from that purchase's own receipt.
 */
export function provesOwnership(a: {
  sessionUserId?: string | null;
  ownerId?: string | null;
  orderEntered?: string | null;
  orderId?: string | null;
}): boolean {
  if (!a.ownerId) return false;
  if (a.sessionUserId && a.sessionUserId === a.ownerId) return true;
  const typed = (a.orderEntered ?? "").trim();
  const real = (a.orderId ?? "").trim();
  return Boolean(typed && real && typed === real);
}
