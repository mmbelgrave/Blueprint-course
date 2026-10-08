"use client";
/**
 * A whole step's words, for the screens that show more than one page at once:
 * the step overview, the printed result, the Blueprint and "Everything I
 * wrote" (review round 4, finding 1).
 *
 * The same bargain as usePageContent — the browser holds the shape, the server
 * holds the words, and the access layer decides. Somebody who owns the step
 * gets all of it. Somebody who does not gets only the pages that are free, so
 * their own answers still read back to them with the questions attached.
 *
 * Kept outside React and published through useSyncExternalStore, so arriving
 * content does not re-render every screen that ever asked for a step.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { StepContent } from "@/lib/content";

export type StepState =
  | { state: "loading" }
  | { state: "ready"; content: StepContent }
  | { state: "refused"; because: string };

const steps = new Map<number, StepContent>();
const refusals = new Map<number, string>();
const asking = new Set<number>();

let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version += 1;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

function ask(step: number) {
  if (steps.has(step) || asking.has(step)) return;
  asking.add(step);
  fetch(`/api/content?step=${step}&full=1`)
    .then(async (r) => {
      const body = await r.json();
      if (r.ok) steps.set(step, body as StepContent);
      else refusals.set(step, body.error ?? "This step is not open to you.");
    })
    .catch(() => refusals.set(step, "We could not load this step. Please check your internet."))
    .finally(() => {
      asking.delete(step);
      changed();
    });
}

export function useStepContent(step: number | undefined): StepState {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );

  useEffect(() => {
    if (step !== undefined && Number.isInteger(step)) ask(step);
  }, [step]);

  if (step === undefined) return { state: "loading" };
  const content = steps.get(step);
  if (content) return { state: "ready", content };
  const because = refusals.get(step);
  if (because) return { state: "refused", because };
  return { state: "loading" };
}

/** Several steps at once, for the Blueprint. Unfinished ones simply stay out. */
export function useStepsContent(wanted: number[]): { ready: Map<number, StepContent>; loading: boolean } {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );

  const key = wanted.join(",");
  useEffect(() => {
    for (const n of key ? key.split(",").map(Number) : []) ask(n);
  }, [key]);

  const ready = new Map<number, StepContent>();
  for (const n of wanted) {
    const c = steps.get(n);
    if (c) ready.set(n, c);
  }
  return { ready, loading: wanted.some((n) => !steps.has(n) && !refusals.has(n)) };
}
