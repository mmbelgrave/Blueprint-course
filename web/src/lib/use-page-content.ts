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
 * Kept for the life of the tab, because somebody who steps back and forth
 * between two pages should not wait twice for the same words.
 */
import { useEffect, useState } from "react";
import type { Exercise, Part } from "@/lib/content";

export type PageContent = { step: number; part: Part; exercise: Exercise };

type State =
  | { state: "loading" }
  | { state: "ready"; content: PageContent }
  | { state: "refused"; because: string };

const kept = new Map<string, PageContent>();

export function usePageContent(exerciseId: string | undefined): State {
  const [, redraw] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId || kept.has(exerciseId)) return;
    let cancelled = false;
    setRefused(null);
    fetch(`/api/content?page=${encodeURIComponent(exerciseId)}`)
      .then(async (r) => {
        const body = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setRefused(body.error ?? "This page is not open to you.");
          return;
        }
        kept.set(exerciseId, body as PageContent);
        redraw((n) => n + 1);
      })
      .catch(() => !cancelled && setRefused("We could not load this page. Please check your internet."));
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  if (!exerciseId) return { state: "loading" };
  const content = kept.get(exerciseId);
  if (content) return { state: "ready", content };
  if (refused) return { state: "refused", because: refused };
  return { state: "loading" };
}
