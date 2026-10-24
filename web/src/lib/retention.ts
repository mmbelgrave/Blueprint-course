/**
 * When a quiet account is written to, and when it goes.
 *
 * The privacy note makes a promise in public: "If you don't sign in for 24
 * months, you're emailed, and the account is deleted if there's no reply
 * within 30 days." The terms make another: at least three years of access to
 * what you bought. Those two can disagree — somebody who buys and then goes
 * quiet would hit the 24-month rule inside the three years — so the access
 * promise wins, every time.
 *
 * Nothing here talks to a database or sends an email. It is the decision
 * only, so the rules can be read in one screen and tested without a server:
 * a mistake in this file deletes somebody's work.
 */

/** The published rules, in one place. Change them here and nowhere else. */
export const QUIET_MONTHS = 24;
export const GRACE_DAYS = 30;
export const ACCESS_YEARS = 3;
/**
 * One short reminder before the deletion (lawyer, 24 October, item B5).
 *
 * Seven days before the thirty are up, so somebody who missed the first
 * letter still has a week to sign in. One reminder and no more: a third
 * letter is nagging, and the first two already said what happens.
 */
export const REMINDER_DAYS = 7;
/**
 * The privacy note: "The log of how much you used your AI partner is kept for
 * 12 months, and questions you send from Help for 12 months after we last
 * spoke." Both were a promise nothing kept until 24 October; now the sweep
 * keeps them.
 *
 * The app does not know when we last spoke, because Mwata answers a question
 * by email, outside it. So a question goes 12 months after it was sent, which
 * is never later than the promise and usually sooner.
 */
export const LOG_MONTHS = 12;

/**
 * How long a chat with the AI partner is kept (lawyer, 24 October, item B3).
 *
 * Twelve months from the day it was written, swept daily like the other logs.
 * The same twelve months are used for the chats and notes of somebody who
 * switched their AI partner off and chose to keep them.
 */
export const CHAT_MONTHS = 12;

export type Account = {
  id: string;
  email: string;
  /** Their last sign-in, or the day the account was made if they never came back. */
  lastSeen: string | null;
  /** When they last bought something, or null for a free account. */
  boughtAt: string | null;
  /** When we emailed them about the silence, or null if we have not. */
  warnedAt: string | null;
  /** When we sent the one reminder, or null if we have not. */
  remindedAt?: string | null;
};

export type Verdict =
  | { act: "keep"; because: string }
  | { act: "warn"; quietSince: string }
  /** The one short reminder, seven days before the deletion. */
  | { act: "remind"; warnedOn: string }
  | { act: "delete"; warnedOn: string }
  /** They came back after the email: the notice is torn up. */
  | { act: "forget"; because: string };

const at = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

const monthsBefore = (now: number, months: number) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.getTime();
};

const yearsBefore = (now: number, years: number) => {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - years);
  return d.getTime();
};

const daysBefore = (now: number, days: number) => now - days * 24 * 60 * 60 * 1000;

/**
 * What to do about one account today.
 *
 * The order of the checks is the argument: the access promise first, then
 * coming back, then the deletion, then the warning. Deleting is only ever
 * reached by an account that was warned and stayed quiet through the grace
 * period.
 */
export function decide(account: Account, now: Date): Verdict {
  const today = now.getTime();
  const seen = at(account.lastSeen);
  const bought = at(account.boughtAt);
  const warned = at(account.warnedAt);

  // Three years of access, as the terms promise. Nothing touches them.
  if (bought !== null && bought > yearsBefore(today, ACCESS_YEARS)) {
    return { act: "keep", because: `bought within the last ${ACCESS_YEARS} years` };
  }

  // Somebody who signed in after the email is not a quiet account any more.
  if (warned !== null && seen !== null && seen > warned) {
    return { act: "forget", because: "signed in after being written to" };
  }

  if (seen === null) return { act: "keep", because: "no sign-in recorded" };

  const quiet = seen < monthsBefore(today, QUIET_MONTHS);
  if (!quiet) return { act: "keep", because: "has signed in recently enough" };

  if (warned === null) return { act: "warn", quietSince: account.lastSeen! };

  if (warned <= daysBefore(today, GRACE_DAYS)) {
    return { act: "delete", warnedOn: account.warnedAt! };
  }

  /*
   * The last week before the deletion. Sent once: the row keeps the minute,
   * so tomorrow's sweep leaves them alone.
   */
  const remindFrom = daysBefore(today, GRACE_DAYS - REMINDER_DAYS);
  if (!account.remindedAt && warned <= remindFrom) {
    return { act: "remind", warnedOn: account.warnedAt! };
  }

  return { act: "keep", because: "written to, still inside the 30 days" };
}

/** The email. No link to sign in: §3.1 says the code is asked for, never sent. */
/**
 * The rows of a log that are older than we said we would keep them.
 *
 * Ids only, so the caller does the deleting and this stays a rule. A row with
 * no date is left alone: something is wrong with it, and a sweep that cannot
 * read a date is the last thing that should decide to delete it.
 */
export function olderThan(
  rows: { id: number; created_at: string | null }[],
  months: number,
  now: Date | string,
): number[] {
  const cutoff = monthsBefore(new Date(now).getTime(), months);
  return rows.filter((r) => {
    const when = at(r.created_at);
    return when !== null && when < cutoff;
  }).map((r) => r.id);
}

export function quietMail(o: { name?: string; appUrl: string; email: string }) {
  const hello = o.name ? `Hello ${o.name},` : "Hello,";
  const text = [
    hello,
    "",
    "You have not signed in to The Made Real Blueprint for two years, so this is",
    "the note our privacy policy promises.",
    "",
    `If you would like to keep your account, sign in at ${o.appUrl} with this`,
    `address (${o.email}) within the next 30 days. There is no password: you ask`,
    "for a code and type it in. That is all it takes.",
    "",
    "If you do nothing, your account and everything in it will be deleted after",
    "those 30 days: your answers, your pictures, your chats and the notes your AI",
    "partner kept. That cannot be undone.",
    "",
    "If you would rather take a copy first, sign in and use Download the file",
    "under Everything I wrote.",
    "",
    "Mwata",
    "The Made Real Blueprint",
  ].join("\n");

  return { subject: "Your Made Real Blueprint account, after at least two quiet years", text };
}

/**
 * The reminder, seven days before the account goes (item B5).
 *
 * Short on purpose: the first letter explained everything, and this one only
 * has to say how little time is left and what one sign-in does.
 */
export function quietReminderMail(o: { name?: string; appUrl: string; email: string; goesOn: string }) {
  const hello = o.name ? `Hello ${o.name},` : "Hello,";
  const text = [
    hello,
    "",
    "A short reminder. We wrote to you about your quiet Made Real Blueprint",
    `account. If nothing changes, it is deleted on ${o.goesOn}, with everything`,
    "in it.",
    "",
    `To keep it, sign in at ${o.appUrl} with this address (${o.email}) before`,
    "that date. One sign-in is enough, and the deletion is called off.",
    "",
    "To keep a copy of your answers instead, sign in and use Download the file",
    "under Everything I wrote.",
    "",
    "Mwata",
    "The Made Real Blueprint",
  ].join("\n");

  return { subject: "Seven days left: your Made Real Blueprint account", text };
}

/** The day a warned account is deleted, for the reminder to name. */
export function deletionDay(warnedAt: string, graceDays: number = GRACE_DAYS): string {
  const day = new Date(warnedAt);
  day.setDate(day.getDate() + graceDays);
  return day.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
