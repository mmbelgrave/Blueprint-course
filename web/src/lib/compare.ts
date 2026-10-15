/**
 * Two people's answers to the same page, side by side (spec §6.8, slice 2).
 *
 * The only clever part is the list comparison: where both of them chose from
 * the same words, as in 1.4, saying which words they both picked is the whole
 * conversation. Free text is never guessed at, it is simply shown twice.
 *
 * No database, no React, no content: the rules are here so they can be tested.
 */

/** Same word, whatever the capitals, spacing or trailing full stop. */
export const same = (a: string, b: string) => key(a) === key(b);

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** A value that is a list of written lines, or null when it is not one. */
export function listOf(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const lines = value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
  return lines.length ? lines : null;
}

export type Overlap = { both: string[]; onlyMine: string[]; onlyTheirs: string[] };

/**
 * What both of them wrote, and what only one of them did.
 *
 * Mine are kept in my own words where we agree, because that is how I wrote it
 * and it is my page too.
 */
export function overlap(mine: string[], theirs: string[]): Overlap {
  const both = mine.filter((m) => theirs.some((t) => same(m, t)));
  return {
    both,
    onlyMine: mine.filter((m) => !theirs.some((t) => same(m, t))),
    onlyTheirs: theirs.filter((t) => !mine.some((m) => same(m, t))),
  };
}

/** Is there anything written here at all? Blank boxes do not count as written. */
export function hasWritten(answers: Record<string, unknown> | undefined): boolean {
  if (!answers) return false;
  return Object.values(answers).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.some((v) => (typeof v === "string" ? v.trim() : v));
    if (typeof value === "object") return Object.values(value as Record<string, unknown>).some((v) => hasWritten({ v }));
    return true;
  });
}

export type Row =
  | { fieldId: string; kind: "list"; mine: string[]; theirs: string[]; overlap: Overlap }
  | { fieldId: string; kind: "value"; mine: unknown; theirs: unknown };

/**
 * One row per field that at least one of them answered.
 *
 * A field neither of them wrote in is left out rather than drawn empty twice.
 * The reserved "agreed" answer is not a side to compare: it is the one they
 * share, and the page shows it on its own.
 */
export function rows(
  fieldIds: string[],
  mine: Record<string, unknown> | undefined,
  theirs: Record<string, unknown> | undefined,
  skip: string[] = [],
): Row[] {
  const out: Row[] = [];
  for (const fieldId of fieldIds) {
    if (skip.includes(fieldId)) continue;
    const a = mine?.[fieldId];
    const b = theirs?.[fieldId];
    if (!hasWritten({ a }) && !hasWritten({ b })) continue;
    const listA = listOf(a);
    const listB = listOf(b);
    if (listA || listB) {
      const left = listA ?? [];
      const right = listB ?? [];
      out.push({ fieldId, kind: "list", mine: left, theirs: right, overlap: overlap(left, right) });
    } else {
      out.push({ fieldId, kind: "value", mine: a, theirs: b });
    }
  }
  return out;
}

/** Every word they both chose, across the whole page: the "you agree" line. */
export function agreedWords(all: Row[]): string[] {
  return all.flatMap((row) => (row.kind === "list" ? row.overlap.both : []));
}

/** Everything only one of them wrote, which is the conversation to have. */
export function differences(all: Row[]): { mine: string[]; theirs: string[] } {
  return {
    mine: all.flatMap((row) => (row.kind === "list" ? row.overlap.onlyMine : [])),
    theirs: all.flatMap((row) => (row.kind === "list" ? row.overlap.onlyTheirs : [])),
  };
}
