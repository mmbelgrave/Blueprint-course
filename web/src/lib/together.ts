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
 * Is this one answer the household shares?
 *
 * The question is always asked about a field, not a page, because that is how
 * an answer is stored. A page can be shared while one box on it is not.
 */
export function isShared(config: TogetherConfig, exerciseId: string, fieldId: string): boolean {
  if (kindOf(config, exerciseId) !== "ours") return false;
  return !mineFieldsOf(config, exerciseId).includes(fieldId);
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
