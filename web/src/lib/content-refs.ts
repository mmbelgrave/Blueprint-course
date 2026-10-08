/*
 * Which fields elsewhere a page reads an answer out of.
 *
 * The browser holds the shape of the workbook but not a word of it (review
 * round 4, finding 1): no row labels, and no record of which column a "known /
 * estimate / unknown" mark belongs to. So a page that adds up another page's
 * table cannot look that table up any more — the server has to send it.
 *
 * This is the list of what to send. It is kept apart from content-server so a
 * test can read it without pulling the whole workbook into the test runner.
 */
import type { Exercise } from "@/lib/content";

/**
 * Pages that read a field they never name: the two written hints that quote
 * the Step 1 cost total, and 4.2, which labels its columns A–D with the option
 * names written in 4.1.
 */
export const ALSO_READS: Record<string, string[]> = {
  "3.5": ["3.2.costs"],
  "s2-3.1": ["3.2.costs"],
  "4.2": ["4.1.options"],
};

/** "3.2.costs" -> ["3.2", "costs"]. Page ids have dots of their own. */
export function splitRef(key: string): [page: string, field: string] {
  const at = key.lastIndexOf(".");
  return [key.slice(0, at), key.slice(at + 1)];
}

/** Every "page.field" this page reads, including ones on the page itself. */
export function referencedFields(exercise: Exercise): string[] {
  const fields = [...(exercise.start_here?.fields ?? []), ...(exercise.go_deeper?.fields ?? [])];
  const wanted = new Set<string>(ALSO_READS[exercise.id] ?? []);
  for (const f of fields) {
    if (f.copy_from) wanted.add(`${f.copy_from.exercise}.${f.copy_from.field}`);
    if (f.rows_from) wanted.add(`${f.rows_from.exercise}.${f.rows_from.field}`);
    // A table's "rows" is a count; a calculation's is the list of its lines.
    if (Array.isArray(f.rows)) {
      for (const row of f.rows as { from?: { exercise: string; field: string } }[]) {
        if (row?.from) wanted.add(`${row.from.exercise}.${row.from.field}`);
      }
    }
  }
  return [...wanted];
}
