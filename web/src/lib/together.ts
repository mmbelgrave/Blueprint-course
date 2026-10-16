/**
 * Who answers what (spec §6.8).
 *
 * A household of two answers some pages once and some pages twice. This file
 * answers that question and nothing else: no database, no React, no content, so
 * it can be tested on its own and asked the same question on the server, where
 * the answer counts.
 *
 * Three kinds of page:
 *   ours   One answer for the household, stored on the buyer's rows.
 *   mine   Each person answers alone; the comparison comes later (slice 2).
 *   read   Nothing to answer, so nothing to share.
 *
 * A field is the unit an answer is stored under, so a shared page can still
 * hold a personal box: `mine_fields` in together.json lists them.
 */

export type Kind = "ours" | "mine" | "read";

export type TogetherConfig = {
  pages: Record<string, Kind>;
  mine_fields: Record<string, string[] | string>;
  private_allowed: { pages: string[] };
  agree_after: { pages: string[] };
};

/** What kind of page this is. An unknown page counts as personal: nothing is shared by accident. */
export function kindOf(config: TogetherConfig, exerciseId: string): Kind {
  return config.pages[exerciseId] ?? "mine";
}

/** The personal boxes inside a shared page. */
export function mineFieldsOf(config: TogetherConfig, exerciseId: string): string[] {
  const value = config.mine_fields[exerciseId];
  return Array.isArray(value) ? value : [];
}

/**
 * The one answer a pair agrees on, on a page they each answered alone.
 *
 * 5.1 asks for the direction you agree on and 3.4.2 for the decision you make
 * together. Both are stored like any other shared answer, under this reserved
 * field id, so no second mechanism is needed to keep them in one place.
 */
export const AGREED_FIELD = "agreed";

/**
 * Is this one answer the household shares?
 *
 * The question is always asked about a field, not a page, because that is how
 * an answer is stored. A page can be shared while one box on it is not, and a
 * personal page can still carry the one answer the two of them agree on.
 */
export function isShared(config: TogetherConfig, exerciseId: string, fieldId: string): boolean {
  if (fieldId === AGREED_FIELD) return asksForAgreement(config, exerciseId);
  if (kindOf(config, exerciseId) !== "ours") return false;
  return !mineFieldsOf(config, exerciseId).includes(fieldId);
}

export type CompareState = {
  /**
   * Marked done, not merely written in.
   *
   * Mwata, 16 October: a half-finished answer is not worth comparing, and
   * every page already carries a "Mark as done" button. So the comparison
   * waits for that button on both sides. It is a rule that can be said in one
   * line, and both people can see where they stand without being told.
   */
  mineDone: boolean;
  theirsDone: boolean;
  theirsPrivate: boolean;
  /**
   * Whether I am keeping this page to myself.
   *
   * Review round 6, finding R6-3: without this, somebody could keep their own
   * 2.3 private and still read their partner's. Privacy on these pages is
   * mutual, which is also the only version that can be explained in one line:
   * a page you keep to yourself is closed both ways.
   */
  minePrivate: boolean;
};

/**
 * May I see the other person's answers to this page?
 *
 * Four things have to be true, and the first is the one the whole feature
 * rests on: I have finished mine. If I could read theirs first, I would write
 * theirs.
 */
export function mayCompare(state: CompareState): boolean {
  return state.mineDone && state.theirsDone && !state.theirsPrivate && !state.minePrivate;
}

/** What the page should say when it cannot show the comparison yet. */
export function waitingBecause(
  state: CompareState,
): "mine-private" | "theirs-private" | "neither" | "only-them" | "only-me" | null {
  if (mayCompare(state)) return null;
  if (state.minePrivate) return "mine-private";
  if (state.theirsPrivate) return "theirs-private";
  if (!state.mineDone && !state.theirsDone) return "neither";
  if (!state.mineDone) return "only-them";
  return "only-me";
}

/** Every page a household answers together. */
export function sharedPages(config: TogetherConfig): string[] {
  return Object.keys(config.pages).filter((id) => config.pages[id] === "ours");
}

/** Every page each person answers alone. */
export function personalPages(config: TogetherConfig): string[] {
  return Object.keys(config.pages).filter((id) => config.pages[id] === "mine");
}

/**
 * Is the progress of this page the household's rather than one person's?
 *
 * A shared page that is finished is finished for both. Without this, a partner
 * opens Step 1 and finds a filled-in money table marked "not started".
 *
 * A page with a personal box on it is still the household's for this purpose:
 * the page is shared, and one box does not undo that.
 */
export function statusIsShared(config: TogetherConfig, exerciseId: string): boolean {
  return kindOf(config, exerciseId) === "ours";
}

/** May a person keep this page private for good (slice 2)? */
export function privateAllowed(config: TogetherConfig, exerciseId: string): boolean {
  return config.private_allowed.pages.includes(exerciseId);
}

/** Does this page ask for one agreed answer once both have written (slice 2)? */
export function asksForAgreement(config: TogetherConfig, exerciseId: string): boolean {
  return config.agree_after.pages.includes(exerciseId);
}
