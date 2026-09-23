// Which pages the AI partner may draft, and from which answers (brief 4.5 / 4.6).
// The person always decides: a draft is shown next to the box, never saved into it.
import { findExercise, partItems, stepExercises, type Exercise, type Field } from "@/lib/content";

/**
 * Besides the part summaries ("What does this tell me?"), only the boxes that
 * bring earlier answers together. Choices, next steps and dates stay the person's own.
 */
const EXTRA_DRAFTABLE: Record<string, string[]> = {
  "5.1": ["life_picture", "essentials", "assumptions"], // Step 1 Working Direction
  "s2-5.1": ["place", "location", "reasons", "not_given", "month_cost", "income", "legal_route", "healthcare", "unknown"], // Explore Summary
};

const isText = (f: Field) => f.type === "long_text" || f.type === "short_text";

/** The boxes on this page the AI partner may draft (empty = no draft button). */
export function draftFields(exercise: Exercise): Field[] {
  if (exercise.kind === "summary") return exercise.start_here.fields.filter(isText);
  const ids = EXTRA_DRAFTABLE[exercise.id];
  return ids ? exercise.start_here.fields.filter((f) => isText(f) && ids.includes(f.id)) : [];
}

/**
 * The pages whose answers a draft may use: for a part summary only that part
 * (brief: "only from their answers for this part"); for 5.1 all of Step 1;
 * for the Explore Summary all of Step 1 and Step 2.
 */
export function draftSourcePages(exerciseId: string): string[] {
  const found = findExercise(exerciseId);
  if (!found) return [];
  if (found.exercise.kind === "summary") {
    return [
      ...partItems(found.part)
        .filter((e) => e.id !== exerciseId)
        .map((e) => e.id),
      `${found.part.id}-setup`,
    ];
  }
  const upTo = found.step.step.number;
  const pages: string[] = [];
  for (let n = 1; n <= upTo; n++) {
    for (const e of stepExercises(n)) if (e.exercise.id !== exerciseId) pages.push(e.exercise.id);
    for (const p of stepExercises(n).map((e) => e.part)) pages.push(`${p.id}-setup`);
  }
  return [...new Set(pages)];
}
