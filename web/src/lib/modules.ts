/**
 * The course as people watch it (spec §6.9).
 *
 * Four levels, and three kinds of module:
 *
 *   Modules   free material · the Introduction · Phase 1 · Phase 2 · Phase 3
 *   a phase   the steps inside it
 *   a step    its lessons
 *   a lesson  the video, the workbook, the way into the exercises
 *
 * The Introduction is a lesson on its own: a welcome video and a workbook, with
 * no exercises, so it stops at the third line above.
 *
 * Two kinds of progress live in this app and they are deliberately different:
 * modules count what has been **watched**, exercises count pages **done**.
 * Someone working in the printed workbook never moves the exercise count and
 * should still see progress, so the two are never averaged into one number.
 *
 * Nothing is imported here, so this can be tested on its own.
 */

export type ModuleVideo = { title: string; length: string | null; url: string | null; audio_url?: string | null };
export type Workbook = { name: string; file: string | null; updated: string | null };

export type ModuleKind = "free" | "lesson" | "phase";

export type FreeItem = { id: string; title: string; blurb?: string; href?: string; video?: ModuleVideo };

export type ModuleDef = {
  id: string;
  kind: ModuleKind;
  name: string;
  blurb?: string;
  /** free: the things on offer. */
  items?: FreeItem[];
  /** lesson: its own video and workbook (the Introduction). */
  video?: ModuleVideo;
  workbook?: Workbook;
  /** phase: which steps it holds. */
  steps?: number[];
};

/** One lesson of a step, as the screens need it. */
export type Lesson = {
  id: string;
  title: string;
  video?: ModuleVideo;
  /** Where this lesson's exercises start. The Introduction has none. */
  exerciseHref?: string;
};

export type Watched = Record<string, boolean>;

/** The key a lesson's "watched" is stored under, kept well away from page ids. */
export const watchedKey = (moduleId: string, stepId: string, lessonId: string) =>
  `module:${moduleId}:${stepId}:${lessonId}`;

/** The Introduction is its own lesson, so it still needs a key. */
export const lessonKey = (moduleId: string) => `module:${moduleId}`;

export type StepSummary = { id: string; number: number; title: string; question: string; released: boolean };

export function lessonsOfStep(
  step: number,
  parts: { id: string; label: string; title: string; video?: ModuleVideo; firstPage?: string }[],
): Lesson[] {
  return parts.map((p) => ({
    id: p.id,
    title: `${p.label} · ${p.title}`,
    video: p.video,
    exerciseHref: p.firstPage ? `/step/${step}/${p.id}/${p.firstPage}` : undefined,
  }));
}

export function progressOfLessons(moduleId: string, stepId: string, lessons: Lesson[], watched: Watched) {
  const total = lessons.length;
  const done = lessons.filter((l) => watched[watchedKey(moduleId, stepId, l.id)]).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), complete: total > 0 && done === total };
}

/** A phase adds up the steps it holds. */
export function progressOfPhase(
  perStep: { done: number; total: number }[],
): { done: number; total: number; percent: number; complete: boolean } {
  const done = perStep.reduce((t, s) => t + s.done, 0);
  const total = perStep.reduce((t, s) => t + s.total, 0);
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), complete: total > 0 && done === total };
}

export type ModuleState = "open" | "buy" | "coming";

/**
 * What to show for a module: open it, offer to buy it, or say it is on its way.
 * A phase nobody has bought says "buy" even when its steps are not written yet,
 * because that is the useful thing to tell someone looking at it.
 */
export function moduleState(
  m: ModuleDef,
  opts: { owns: (step: number) => boolean; released: (step: number) => boolean },
): ModuleState {
  if (m.kind !== "phase") return "open";
  const steps = m.steps ?? [];
  if (!steps.some(opts.owns)) return "buy";
  return steps.some(opts.released) ? "open" : "coming";
}
