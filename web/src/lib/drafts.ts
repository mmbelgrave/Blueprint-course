// Which pages the AI partner may draft, and from which answers (brief 4.5 / 4.6).
// The person always decides: a draft is shown next to the box, never saved into it.
import { findExercise, stepExercises, type Exercise, type Field } from "@/lib/content";

/**
 * The only pages the AI partner may draft, and which boxes on them.
 *
 * Three pages, one at the end of each route through a step: they pull a whole
 * step of the person's own writing together, which is where a blank page is
 * genuinely hard and where every word of the draft comes from something they
 * already wrote.
 *
 * Everywhere else the first words are theirs (Mwata, 20 October). The part
 * summaries used to be draftable too — "My First Picture" among them — and
 * having the AI write somebody's first picture is the one place it should not
 * be. The panel beside every page still offers to help them start, ask a
 * deeper question or challenge what they wrote; none of those writes an
 * answer.
 *
 * Choices, next steps and dates are never drafted, even here.
 */
const DRAFTABLE: Record<string, string[]> = {
  // Step 1 Working Direction. The choice, the next step and the dates are theirs.
  "5.1": ["life_picture", "essentials", "assumptions"],
  // Explore Summary (workbook v8 field names).
  "s2-5.1": [
    "place",
    "where",
    "reasons",
    "not_give",
    "monthly_cost",
    "income",
    "legal",
    "healthcare",
    "unknowns",
    "who_i_need",
  ],
  // The staying route's summary (S7, workbook Rev.01c). Without this, a
  // person who stays is the only one who gets no draft on their own summary.
  "s2-s7": [
    "change",
    "gives_keeps",
    "reasons",
    "not_give",
    "money",
    "rules",
    "hours",
    "people",
    "test",
    "unknowns",
  ],
};

const isText = (f: Field) => f.type === "long_text" || f.type === "short_text";

/** The boxes on this page the AI partner may draft (empty = no draft button). */
export function draftFields(exercise: Exercise): Field[] {
  const ids = DRAFTABLE[exercise.id];
  return ids ? (exercise.start_here?.fields ?? []).filter((f) => isText(f) && ids.includes(f.id)) : [];
}

/**
 * The pages whose answers a draft may use: everything the person has written
 * up to and including this step. My Working Direction draws on Step 1, the
 * Explore Summary on Steps 1 and 2, and so on — which is the point of those
 * three pages.
 */
export function draftSourcePages(exerciseId: string): string[] {
  const found = findExercise(exerciseId);
  if (!found) return [];
  const upTo = found.step.step.number;
  const pages: string[] = [];
  for (let n = 1; n <= upTo; n++) {
    for (const e of stepExercises(n)) if (e.exercise.id !== exerciseId) pages.push(e.exercise.id);
    for (const p of stepExercises(n).map((e) => e.part)) pages.push(`${p.id}-setup`);
  }
  return [...new Set(pages)];
}
