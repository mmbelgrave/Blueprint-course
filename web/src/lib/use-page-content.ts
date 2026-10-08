"use client";
/**
 * One page of the workbook, fetched when the page opens (review round 4,
 * finding 1).
 *
 * The words are the product, so they are not compiled into the browser bundle.
 * A screen asks for the page it is showing, the server asks the access layer,
 * and the text arrives only if this person may have it. A stranger gets 401, a
 * free account gets 1.2 and nothing else.
 *
 * What has arrived is kept for the life of the tab, outside React, because
 * somebody stepping back and forth between two pages should not wait twice for
 * the same words. React is told about it through useSyncExternalStore rather
 * than by setting state inside an effect, which the compiler rules forbid and
 * which would re-render every reader of this hook on every fetch.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { Exercise, Part } from "@/lib/content";

export type PageContent = { step: number; part: Part; exercise: Exercise };

export type PageState =
  | { state: "loading" }
  | { state: "ready"; content: PageContent }
  | { state: "refused"; because: string };

const pages = new Map<string, PageContent>();
const refusals = new Map<string, string>();
const asking = new Set<string>();

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

function ask(id: string) {
  if (pages.has(id) || asking.has(id)) return;
  asking.add(id);
  fetch(`/api/content?page=${encodeURIComponent(id)}`)
    .then(async (r) => {
      const body = await r.json();
      if (r.ok) pages.set(id, body as PageContent);
      else refusals.set(id, body.error ?? "This page is not open to you.");
    })
    .catch(() => refusals.set(id, "We could not load this page. Please check your internet."))
    .finally(() => {
      asking.delete(id);
      changed();
    });
}

export function usePageContent(exerciseId: string | undefined): PageState {
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );

  useEffect(() => {
    if (exerciseId) ask(exerciseId);
  }, [exerciseId]);

  if (!exerciseId) return { state: "loading" };
  const content = pages.get(exerciseId);
  if (content) return { state: "ready", content };
  const because = refusals.get(exerciseId);
  if (because) return { state: "refused", because };
  return { state: "loading" };
}
