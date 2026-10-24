/**
 * The AI partner and the pages a household answers together (lawyer, 24
 * October, item B2).
 *
 * A shared page holds two people's words in one answer. One of them agreeing
 * that an AI model may read their words does not make the other one agree, so
 * until both have switched their AI partner on, the shared pages are out of
 * bounds: no chat on them, no draft from them, and nothing from them in the
 * notes. Everybody's own pages work as before.
 *
 * Nothing here reads a database or any content file. The two predicates it
 * needs are handed in, so the rule can be read in one screen and tested on
 * its own: this is the file that decides whether somebody's words leave the
 * app, and that decision should not depend on what else is imported.
 */

/** What is known about the two AI partners in one household. */
export type PairAi = {
  /** There really are two people here: an invitation nobody used is not a pair. */
  pair: boolean;
  /** This person has switched their AI partner on, at the current wording. */
  mineOn: boolean;
  /** The other person has. Null when it could not be read, which counts as no. */
  theirsOn: boolean | null;
};

/** The one rule: both, or neither. */
export function sharedPagesAllowed(ai: PairAi): boolean {
  if (!ai.pair) return true;
  return ai.mineOn && ai.theirsOn === true;
}

/** Said on a shared page when the other person has not switched theirs on. */
export const AI_WAITS_FOR_BOTH =
  "Your AI partner stays out of the pages you answer together until you have both switched it on. " +
  "It is your partner's words here as well as yours.";

/** The same thing, from a route, where there is room for one sentence only. */
export const AI_OFF_ON_SHARED =
  "Your AI partner does not read the pages you answer together until you have both switched it on.";

/** Beside a note that came from a shared page. */
export const SHARED_NOTE_NOTE = "Your partner can see and delete this note too.";

/**
 * Which notes are made from pages the household answers together.
 *
 * `sources` is the map of note to pages (lib/profile-fields). A note counts as
 * shared when any of its pages is shared, because one shared page is enough
 * for the note to be about both of them. "patterns_and_tensions" has no pages
 * of its own and is drawn from the others, so it is shared as soon as any
 * other shared note exists.
 */
export function notesFromSharedPages(
  sources: Record<string, { page: string }[]>,
  isSharedPage: (page: string) => boolean,
): string[] {
  const keys: string[] = [];
  for (const [key, pages] of Object.entries(sources)) {
    if (pages.some((p) => isSharedPage(p.page))) keys.push(key);
  }
  if (keys.length > 0 && Object.keys(sources).includes("patterns_and_tensions") && !keys.includes("patterns_and_tensions")) {
    keys.push("patterns_and_tensions");
  }
  return keys;
}

/**
 * The same answers with every shared one taken out.
 *
 * Used when the pair have not both switched the AI partner on. The person
 * still sees those answers on the page; what changes is that they are not in
 * what is sent.
 */
export function withoutSharedAnswers<T>(
  answers: Record<string, Record<string, T>>,
  isSharedAnswer: (exerciseId: string, fieldId: string) => boolean,
): Record<string, Record<string, T>> {
  const out: Record<string, Record<string, T>> = {};
  for (const [page, fields] of Object.entries(answers)) {
    const kept: Record<string, T> = {};
    for (const [field, value] of Object.entries(fields)) {
      if (!isSharedAnswer(page, field)) kept[field] = value;
    }
    if (Object.keys(kept).length > 0) out[page] = kept;
  }
  return out;
}
