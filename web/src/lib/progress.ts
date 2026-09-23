import { findExercise, partItems, stepExercises, type Located, type Part, type StepContent } from "@/lib/content";
import type { ExerciseStatus } from "@/lib/backend";

type Statuses = Record<string, ExerciseStatus>;

/** Progress counts the required items (exercises + summary); optional ones never block. */
export function partProgress(part: Part, statuses: Statuses) {
  const required = partItems(part).filter((e) => !e.optional);
  const done = required.filter((e) => statuses[e.id] === "done").length;
  return { done, total: required.length, complete: done === required.length };
}

/** Progress of a whole step, over its required parts. */
export function stepProgress(step: StepContent, statuses: Statuses) {
  let done = 0;
  let total = 0;
  for (const part of step.parts) {
    if (part.optional) continue;
    const p = partProgress(part, statuses);
    done += p.done;
    total += p.total;
  }
  return { done, total, complete: total > 0 && done === total, started: stepExercises(step.step.number).some((e) => statuses[e.exercise.id]) };
}

// The last exercise a person opened, per device and step (a convenience only).
const lastKey = (userId: string, step: number) => `blueprint-last-exercise:${userId}:${step}`;

export function rememberLastExercise(userId: string, step: number, exerciseId: string) {
  try {
    window.localStorage.setItem(lastKey(userId, step), exerciseId);
  } catch {
    // Not important enough to report.
  }
}

function lastExercise(userId: string, step: number) {
  try {
    return window.localStorage.getItem(lastKey(userId, step));
  } catch {
    return null;
  }
}

const isRequired = (e: Located) => !e.part.optional && !e.exercise.optional;

/**
 * Where "Continue where I stopped" goes in a step: the last exercise the person
 * used there (if not done yet), else the first unfinished required one in order.
 */
export function continueTarget(step: number, statuses: Statuses, userId: string | undefined) {
  const last = userId ? findExercise(lastExercise(userId, step) ?? "") : undefined;
  if (last && last.step.step.number === step && statuses[last.exercise.id] !== "done") return last;
  const pages = stepExercises(step);
  return (
    pages.find((e) => isRequired(e) && statuses[e.exercise.id] === "in_progress") ??
    pages.find((e) => isRequired(e) && statuses[e.exercise.id] !== "done") ??
    null
  );
}

export function stepHref(step: number) {
  return `/step/${step}`;
}

export function exerciseHref(step: number, partId: string, exerciseId: string) {
  return `/step/${step}/${partId}/${exerciseId}`;
}

/** Link to a located page. */
export const hrefOf = (e: Located) => exerciseHref(e.step.step.number, e.part.id, e.exercise.id);
