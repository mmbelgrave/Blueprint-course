/**
 * The workbook text, on the server only (review round 4, finding 1).
 *
 * The words are the product. Anything a client component imports is compiled
 * into JavaScript that a stranger can fetch without an account, so the full
 * content may only ever be read here, behind the access layer, and handed out
 * a page at a time to someone who may have it.
 *
 * `server-only` is not decoration: importing this file from a client component
 * fails the build. That is the whole point — the rule is enforced by the
 * compiler rather than by anyone remembering it.
 *
 * lib/content.ts stays the browser's copy, and now carries only the spine: the
 * shape of each step with none of its words in it.
 */
import "server-only";

import step1Raw from "@/content/step1-content.json";
import step2Raw from "@/content/step2-content.json";
import step3Raw from "@/content/step3-content.json";
import { accessConfig } from "@/lib/access-app";
import { summaryAsExercise, type Exercise, type Part, type StepContent } from "@/lib/content";
import { referencedFields, splitRef } from "@/lib/content-refs";

/** Every step that exists, released or not. Only this file may hold them all. */
const ALL = [step1Raw, step2Raw, step3Raw] as unknown as StepContent[];

export const fullStep = (number: number): StepContent | undefined =>
  ALL.find((s) => s.step.number === number);

/**
 * The pages of a part, in the order someone works through them — built by the
 * same function the screens use, so a summary arrives in the shape they expect
 * rather than in the shape it is stored in.
 */
const itemsOf = (part: Part): Exercise[] =>
  part.summary ? [...part.exercises, summaryAsExercise(part, part.summary)] : part.exercises;

export type FoundPage = { step: StepContent; part: Part; exercise: Exercise };

/**
 * Every field elsewhere that this page reads an answer out of: the ones it
 * offers to copy forward, the ones its sums add up, and the ones it takes its
 * row labels from. Keyed "3.2.costs", because the browser holds the shape of
 * those pages but not a word of them — not their row labels, not which column
 * the "known / estimate / unknown" mark belongs to. Sent with the page, so a
 * total is drawn from the real field or not drawn at all.
 */
export function sourceFieldsFor(exercise: Exercise): { key: string; step: number; field: unknown }[] {
  const out: { key: string; step: number; field: unknown }[] = [];
  for (const key of referencedFields(exercise)) {
    const [fromPage, fromField] = splitRef(key);
    const page = findPage(fromPage);
    if (!page) continue;
    const field = [...(page.exercise.start_here?.fields ?? []), ...(page.exercise.go_deeper?.fields ?? [])].find(
      (f) => f.id === fromField,
    );
    if (field) out.push({ key, step: page.step.step.number, field });
  }
  return out;
}

/** One page, wherever it lives, so a route can hand over exactly that much. */
export function findPage(exerciseId: string): FoundPage | undefined {
  for (const step of ALL) {
    for (const part of step.parts) {
      const exercise = itemsOf(part).find((e) => e.id === exerciseId);
      if (exercise) return { step, part, exercise };
    }
  }
  return undefined;
}

/**
 * A step without its pages: the welcome, the route table, the word help and the
 * sources. What a step overview needs, and nothing a page would need.
 */
export function stepChrome(number: number) {
  const found = fullStep(number);
  if (!found) return undefined;
  const { parts, ...rest } = found;
  return { ...rest, parts: parts.map((p) => ({ id: p.id, label: p.label, title: p.title })) };
}

/**
 * The free pages of a step, shaped like a step so the screens do not need a
 * second shape. Somebody with a free account wrote an answer on 1.2; this is
 * what lets them read it back with the question attached, and nothing more.
 */
export function freePagesOf(number: number) {
  const step = fullStep(number);
  if (!step) return { step: { id: "", number, title: "", question: "" }, parts: [] } as unknown as StepContent;
  const free = new Set(accessConfig.free.pages);
  const parts = step.parts
    .map((part) => ({ ...part, exercises: part.exercises.filter((e) => free.has(e.id)), summary: undefined }))
    .filter((part) => part.exercises.length > 0);
  return { ...step, parts } as StepContent;
}
