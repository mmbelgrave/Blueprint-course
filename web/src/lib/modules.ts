/**
 * The course as people watch it (spec §6.9).
 *
 * A module is a step seen from the video side: its parts, each with a video, a
 * workbook to download, and a way into the exercises. "Free material" is a
 * module too, so there is one shape for everything on the Modules screen.
 *
 * Two kinds of progress live in this app and they are deliberately different:
 *
 *   - **Modules** count what has been *watched*.
 *   - **Exercises** count pages *done*.
 *
 * Someone who works in the printed workbook will never move the exercise count
 * and should still see their progress, which is why the two are kept apart
 * rather than averaged into one misleading number.
 *
 * Nothing is imported here but the types, so this can be tested on its own.
 */

export type ModuleVideo = { title: string; length: string | null; url: string | null; audio_url?: string | null };

export type ModuleItem = {
  id: string;
  title: string;
  blurb?: string;
  video?: ModuleVideo;
};

export type Workbook = { name: string; file: string | null; updated: string | null };

export type ModuleDef = {
  id: string;
  name: string;
  blurb?: string;
  /** A module that is a step takes its parts from the step's own content. */
  step?: number;
  /** A module that is not a step lists what it holds. */
  items?: ModuleItem[];
  workbook?: Workbook;
};

/** One part of a module, as the screens need it. */
export type ModulePart = {
  id: string;
  title: string;
  blurb?: string;
  video?: ModuleVideo;
  /** Where this part's exercises start, when it has any. */
  exerciseHref?: string;
};

/** Watched is the tickbox, or a video seen to the end — either counts. */
export type Watched = Record<string, boolean>;

export function partsOfModule(
  module: ModuleDef,
  stepParts: (step: number) => { id: string; label: string; title: string; video?: ModuleVideo; firstPage?: string }[],
): ModulePart[] {
  if (module.step !== undefined) {
    return stepParts(module.step).map((p) => ({
      id: p.id,
      title: `${p.label} · ${p.title}`,
      video: p.video,
      exerciseHref: p.firstPage ? `/step/${module.step}/${p.id}/${p.firstPage}` : undefined,
    }));
  }
  return (module.items ?? []).map((i) => ({ id: i.id, title: i.title, blurb: i.blurb, video: i.video }));
}

/** The key a part's "watched" is stored under, kept well away from exercise ids. */
export const watchedKey = (moduleId: string, partId: string) => `module:${moduleId}:${partId}`;

export function moduleProgress(module: ModuleDef, parts: ModulePart[], watched: Watched) {
  const total = parts.length;
  const done = parts.filter((p) => watched[watchedKey(module.id, p.id)]).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), complete: total > 0 && done === total };
}

/** A module nobody can open yet still shows, so people can see what is coming. */
export type ModuleState = "open" | "locked" | "not-released";

export function moduleState(
  module: ModuleDef,
  opts: { released: (step: number) => boolean; open: (module: ModuleDef) => boolean },
): ModuleState {
  if (module.step !== undefined && !opts.released(module.step)) return "not-released";
  return opts.open(module) ? "open" : "locked";
}
