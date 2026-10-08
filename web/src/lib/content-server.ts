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
 * lib/content.ts stays the browser's copy. Today it still carries the released
 * steps in full; emptying it of prose is the rest of this piece of work.
 */
import "server-only";

import step1Raw from "@/content/step1-content.json";
import step2Raw from "@/content/step2-content.json";
import step3Raw from "@/content/step3-content.json";
import type { Exercise, Part, StepContent } from "@/lib/content";

/** Every step that exists, released or not. Only this file may hold them all. */
const ALL = [step1Raw, step2Raw, step3Raw] as unknown as StepContent[];

export const fullStep = (number: number): StepContent | undefined =>
  ALL.find((s) => s.step.number === number);

/** The pages of a part, in the order someone works through them. */
const itemsOf = (part: Part): Exercise[] => [
  ...part.exercises,
  ...(part.summary ? [{ ...part.summary, kind: "summary" } as unknown as Exercise] : []),
];

export type FoundPage = { step: StepContent; part: Part; exercise: Exercise };

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
