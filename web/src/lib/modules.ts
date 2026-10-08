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

export type FreeItem = {
  id: string;
  title: string;
  blurb?: string;
  /** A free exercise is a PDF: no account, no progress, nothing to lose. */
  pdf?: string;
  href?: string;
  video?: ModuleVideo;
};

export type ModuleDef = {
  id: string;
  kind: ModuleKind;
  name: string;
  blurb?: string;
  /** Which edition a phase belongs to; a later phase may not be Portugal. */
  edition?: string;
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
  /** The part's own number, so the Start page is 0 and Part 1 is 1. */
  number: number;
  video?: ModuleVideo;
  /** The video and the exercises together, as a person would read it. */
  time?: string;
  /** Where this lesson's exercises start. The Introduction has none. */
  exerciseHref?: string;
};

/**
 * How long a lesson takes: the video plus the work, because that is the
 * evening someone has to find. The two figures come from the workbook as
 * ranges ("12–16 min", "3–5 hours"), so they are added as ranges and rounded
 * to five minutes. A time that is not a span of minutes — Step 2's "A trip" —
 * is never arithmetic, so it is simply named beside the video.
 */
const span = (text?: string | null): [number, number] | null => {
  if (!text) return null;
  const m = /^\s*(\d+)\s*(?:[–—-]\s*(\d+))?\s*(min|minute|hour|hr)/i.exec(text);
  if (!m) return null;
  const unit = m[3].toLowerCase().startsWith("h") ? 60 : 1;
  const lo = Number(m[1]) * unit;
  const hi = (m[2] ? Number(m[2]) : Number(m[1])) * unit;
  return [lo, hi];
};

const clock = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
};

export function lessonTime(video?: string | null, work?: string | null): string | undefined {
  const a = span(video);
  const b = span(work);
  if (a && b) {
    const lo = Math.round((a[0] + b[0]) / 5) * 5;
    const hi = Math.round((a[1] + b[1]) / 5) * 5;
    if (lo === hi) return clock(lo);
    return hi < 60 ? `${lo}–${hi} min` : `${clock(lo)} – ${clock(hi)}`;
  }
  // Only one of the two is a number, or neither: say both, plainly.
  return [video, work].filter(Boolean).join(" · ") || undefined;
}

export type Watched = Record<string, boolean>;

/** The key a lesson's "watched" is stored under, kept well away from page ids. */
export const watchedKey = (moduleId: string, stepId: string, lessonId: string) =>
  `module:${moduleId}:${stepId}:${lessonId}`;

/** The Introduction is its own lesson, so it still needs a key. */
export const lessonKey = (moduleId: string) => `module:${moduleId}`;

export type StepSummary = { id: string; number: number; title: string; question: string; released: boolean };

export function lessonsOfStep(
  step: number,
  parts: {
    id: string;
    number: number;
    label: string;
    title: string;
    video?: ModuleVideo;
    time?: string;
    firstPage?: string;
  }[],
): Lesson[] {
  return parts.map((p) => ({
    id: p.id,
    number: p.number,
    title: `${p.label} · ${p.title}`,
    video: p.video,
    time: lessonTime(p.video?.length, p.time),
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
  if (!steps.some(opts.released)) return "coming";
  return steps.some(opts.owns) ? "open" : "buy";
}
