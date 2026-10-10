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

export type Account = {
  id: string;
  email: string;
  /** Their last sign-in, or the day the account was made if they never came back. */
  lastSeen: string | null;
  /** When they last bought something, or null for a free account. */
  boughtAt: string | null;
  /** When we emailed them about the silence, or null if we have not. */
  warnedAt: string | null;
};

export type Verdict =
  | { act: "keep"; because: string }
  | { act: "warn"; quietSince: string }
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
  return { act: "keep", because: "written to, still inside the 30 days" };
}

/** The email. No link to sign in: §3.1 says the code is asked for, never sent. */
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
    "for a code and type it in. That is all it takes — nothing else is needed.",
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

  return { subject: "Your Made Real Blueprint account, after two quiet years", text };
}
