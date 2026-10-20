/**
 * The module rules (modules.ts) tied to this app's own files: modules.json for
 * the list, the step content for the lessons, access.json for who may open
 * what, and journey.json for what has been released.
 */
import modulesRaw from "@/content/modules.json";
import type { Entitlement } from "@/lib/access";
import { ownedSteps } from "@/lib/access";
import { accessConfig, requirePurchase } from "@/lib/access-app";
export { isFree } from "@/lib/access-app";
import { getStep, journey, partItems, stepIsOpen } from "@/lib/content";
import {
  lessonsOfStep,
  moduleState,
  progressOfLessons,
  progressOfPhase,
  watchedKey,
  type Lesson,
  type ModuleDef,
  type ModuleVideo,
  type StepSummary,
  type Workbook,
} from "@/lib/modules";

const raw = modulesRaw as unknown as {
  modules: ModuleDef[];
  workbooks: Record<string, Workbook>;
  buy_url: string;
  notify_url: string;
};

export const modules = raw.modules;
export const workbooks = raw.workbooks;
export const buyUrl = raw.buy_url;
/** The "tell me when it opens" pop-up on the website, for a phase not written yet. */
export const notifyUrl = raw.notify_url;

export const moduleById = (id: string) => modules.find((m) => m.id === id);

/**
 * The file name of the still for one video.
 *
 * Taken from our own content, never from the request, and only ever a plain
 * file name. A video nobody has chosen a frame for keeps Bunny's own
 * "thumbnail.jpg".
 */
export function posterFileOf(videoId: string): string {
  const videos: ModuleVideo[] = [];
  for (const m of modules) if ((m as { video?: ModuleVideo }).video) videos.push((m as { video?: ModuleVideo }).video!);
  for (const step of [1, 2, 3]) for (const lesson of lessonsOf(step)) if (lesson.video) videos.push(lesson.video);
  const named = videos.find((v) => v.url === videoId)?.poster_file;
  return named && /^[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(named) ? named : "thumbnail.jpg";
}
export const stepIdOf = (step: number) => `step-${step}`;

/**
 * Where a step's lessons are listed: the page with the videos on it.
 *
 * This is the overview people start from and come back to (Mwata, 20 Oct):
 * watch the video, do the exercises, come back for the next one.
 */
export const stepLessonsHref = (step: number) => {
  const owner = modules.find((m) => (m.steps as number[] | undefined)?.includes(step));
  return owner ? `/modules/${owner.id}/${stepIdOf(step)}` : "/dashboard";
};
export const workbookOf = (stepId: string) => workbooks[stepId];

/** Which steps this person owns. Until buying exists, every released step. */
const owns = (entitlements: Entitlement[]) => {
  if (!requirePurchase) return () => true;
  const mine = new Set(ownedSteps(entitlements, accessConfig));
  return (step: number) => mine.has(step);
};

export const stateOf = (m: ModuleDef, entitlements: Entitlement[]) =>
  moduleState(m, { owns: owns(entitlements), released: stepIsOpen });

/** The steps of a phase, with what the overview needs to draw them. */
export function stepsOfPhase(m: ModuleDef): StepSummary[] {
  return (m.steps ?? []).map((n) => {
    const fromJourney = journey.steps.find((s) => s.number === n);
    return {
      id: stepIdOf(n),
      number: n,
      title: fromJourney?.title ?? `Step ${n}`,
      question: fromJourney?.question ?? "",
      released: stepIsOpen(n),
    };
  });
}

/** What a closed step says. One wording everywhere: "coming soon". */
export const noteForStep = (n: number) =>
  journey.steps.find((s) => s.number === n)?.note ?? "coming soon";

export function lessonsOf(step: number): Lesson[] {
  const parts = (getStep(step)?.parts ?? []).map((p) => ({
    id: p.id,
    number: p.number,
    label: p.label,
    title: p.title,
    video: p.video,
    time: p.time,
    firstPage: partItems(p)[0]?.id,
  }));
  return lessonsOfStep(step, parts);
}

const watchedFrom = (statuses: Record<string, string>) => (key: string) => statuses[key] === "done";

export function stepProgress(moduleId: string, step: number, statuses: Record<string, string>) {
  const stepId = stepIdOf(step);
  const lessons = lessonsOf(step);
  const seen = watchedFrom(statuses);
  const watched: Record<string, boolean> = {};
  for (const l of lessons) watched[watchedKey(moduleId, stepId, l.id)] = seen(watchedKey(moduleId, stepId, l.id));
  return progressOfLessons(moduleId, stepId, lessons, watched);
}

export function phaseProgress(m: ModuleDef, statuses: Record<string, string>) {
  return progressOfPhase((m.steps ?? []).filter(stepIsOpen).map((n) => stepProgress(m.id, n, statuses)));
}

/**
 * What a free account may open inside a phase: the lessons and the exercise
 * pages access.json calls free. Shown as a short list instead of the steps,
 * because there is no journey to show someone who owns none of it.
 */
export function freeThingsIn(m: ModuleDef): { kind: "lesson" | "page"; href: string; title: string; note: string }[] {
  const out: { kind: "lesson" | "page"; href: string; title: string; note: string }[] = [];
  for (const n of (m.steps ?? []).filter(stepIsOpen)) {
    const stepId = stepIdOf(n);
    for (const l of lessonsOf(n)) {
      if (accessConfig.free.lessons.includes(`${stepId}:${l.id}`)) {
        out.push({ kind: "lesson", href: `/modules/${m.id}/${stepId}/${l.id}`, title: l.title, note: "Video" });
      }
    }
    for (const p of getStep(n)?.parts ?? []) {
      for (const item of partItems(p)) {
        if (accessConfig.free.pages.includes(item.id)) {
          out.push({
            kind: "page",
            href: `/step/${n}/${p.id}/${item.id}`,
            title: `${item.number ?? item.id} ${item.title}`.trim(),
            note: "Exercise",
          });
        }
      }
    }
  }
  return out;
}

/**
 * A free exercise, which is a PDF rather than a page.
 *
 * Only modules of the free kind are searched (review round 4, R4-10). The
 * workbook route takes the `free=` branch before it asks anybody about
 * purchases, so this lookup is the whole gate: an item added under a paid
 * module must not become free by sitting in the same list of items.
 */
export const freeItemById = (id: string) =>
  modules
    .filter((m) => m.kind === "free")
    .flatMap((x) => x.items ?? [])
    .find((i) => i.id === id);

export { watchedKey };
export { lessonKey } from "@/lib/modules";
