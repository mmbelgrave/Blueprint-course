/**
 * The module rules (modules.ts) tied to this app's own content: modules.json
 * for the list, the step content for the parts, and the access layer for what
 * a person may open.
 */
import modulesRaw from "@/content/modules.json";
import { itemFor, stepFor } from "@/lib/access-app";
import type { Entitlement } from "@/lib/access";
import { getStep, journey, partItems, stepIsOpen } from "@/lib/content";
import { moduleProgress, moduleState, partsOfModule, watchedKey, type ModuleDef, type ModulePart } from "@/lib/modules";

export const modules = (modulesRaw as unknown as { modules: ModuleDef[] }).modules;

export const moduleById = (id: string) => modules.find((m) => m.id === id);

/** Parts of a step, named once in the step's own content. */
const stepParts = (step: number) =>
  (getStep(step)?.parts ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    title: p.title,
    video: p.video,
    firstPage: partItems(p)[0]?.id,
  }));

export const partsOf = (module: ModuleDef): ModulePart[] => partsOfModule(module, stepParts);

/** Is this module open to this person? Free modules go through the free list. */
export const stateOf = (module: ModuleDef, entitlements: Entitlement[]) =>
  moduleState(module, {
    released: stepIsOpen,
    open: (m) => (m.step === undefined ? itemFor(m.id, entitlements).open : stepFor(m.step, entitlements).open),
  });

/**
 * What has been watched. The tickbox writes an exercise_status row under a key
 * that cannot collide with a page id, so the machinery that already saves "done"
 * saves this too.
 */
export const watchedFrom = (statuses: Record<string, string>, module: ModuleDef, parts: ModulePart[]) => {
  const watched: Record<string, boolean> = {};
  for (const p of parts) {
    const key = watchedKey(module.id, p.id);
    watched[key] = statuses[key] === "done";
  }
  return watched;
};

export const progressOf = (module: ModuleDef, parts: ModulePart[], statuses: Record<string, string>) =>
  moduleProgress(module, parts, watchedFrom(statuses, module, parts));

/** What the overview says about a module that is not open: "opens soon", or why. */
export const noteFor = (course: ModuleDef) =>
  (course.step !== undefined && journey.steps.find((s) => s.number === course.step)?.note) || "being written";

export { watchedKey };
