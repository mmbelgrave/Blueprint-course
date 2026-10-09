/**
 * "I bought it, but I cannot get in" (spec §6.1).
 *
 * Somebody pays with one address and signs in with another — a work address at
 * the checkout, a personal one in the app — or a webhook never arrives. Rather
 * than ask Mwata to fix it by hand every time, they prove they control the
 * address they paid with, and the purchase moves to the account they are
 * actually using.
 *
 * Moves, never copies. One order opens one account, and after a move the old
 * account has nothing: that is the whole point of the rule.
 *
 * The rules live here, apart from the route, so they can be read and tested
 * without a database.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** Long enough to be worth guessing at, short enough to read off a phone. */
export const CODE_LENGTH = 6;

/** Fifteen minutes: long enough to find the email, short enough to matter. */
export const CLAIM_MINUTES = 15;

/** One code a minute per person, so this cannot be used to work through a list. */
export const COOLDOWN_SECONDS = 60;

/** After this many wrong tries the code is dead and they ask for a new one. */
export const MAX_ATTEMPTS = 5;

export const newCode = (): string => String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");

/**
 * Stored as a hash, like a password. The email address is mixed in, so a hash
 * lifted from one row cannot be replayed against another.
 */
export const hashCode = (code: string, email: string): string =>
  createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");

export function codeMatches(given: string, stored: string, email: string): boolean {
  const a = Buffer.from(hashCode(given.trim(), email), "hex");
  const b = Buffer.from(stored, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type ClaimRow = { attempts: number; expires_at: string; used_at: string | null };

export type ClaimCheck =
  | { ok: true }
  | { ok: false; why: string; dead: boolean };

/**
 * Whether this code may still be tried at all. `dead` means the row is spent:
 * the route stops offering it and the person asks for a new code.
 */
export function claimUsable(row: ClaimRow | null, now = new Date()): ClaimCheck {
  if (!row) return { ok: false, why: "Ask for a code first.", dead: true };
  if (row.used_at) return { ok: false, why: "That code has already been used.", dead: true };
  if (new Date(row.expires_at) <= now) {
    return { ok: false, why: "That code has expired. Ask for a new one.", dead: true };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, why: "Too many tries. Ask for a new code.", dead: true };
  }
  return { ok: true };
}

export const expiresAt = (now = new Date()): string =>
  new Date(now.getTime() + CLAIM_MINUTES * 60_000).toISOString();

/**
 * The email with the code.
 *
 * This one does carry a code, and §3.1 still holds: it is a code the person
 * has just asked for, sent to the address they named, and it signs nobody in
 * on its own — it only moves a purchase to an account that is already signed
 * in somewhere else.
 */
export function claimMail(o: { code: string; signedInAs: string }) {
  const text = [
    "Hello,",
    "",
    "You asked to move your purchase of The Made Real Blueprint to the account you",
    `are signed in with, ${o.signedInAs}.`,
    "",
    `Your code is ${o.code}`,
    "",
    `It works for ${CLAIM_MINUTES} minutes. Type it into the app and your course moves across,`,
    "with everything you have already written.",
    "",
    "If this was not you, do nothing. Nothing moves without this code, and you can",
    "tell me at info@maderealblueprint.com.",
    "",
    "Mwata",
    "The Made Real Blueprint",
  ].join("\n");

  return { subject: `Your code to move your course: ${o.code}`, text };
}
