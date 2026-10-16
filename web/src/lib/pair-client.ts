"use client";
/**
 * The other person's answers for a result document (spec §6.8, slice 3).
 *
 * Asked for once when a print page opens. For almost every account the answer
 * is "there is nobody", and the document is the one-voice document it has
 * always been.
 */
import { useEffect, useState } from "react";
import type { Answers } from "@/lib/report";

export type Pair = { name: string; theirs: Answers } | null;

export function usePair(steps: number[]): { loading: boolean; pair: Pair } {
  const [state, setState] = useState<{ loading: boolean; pair: Pair }>({ loading: true, pair: null });
  const key = steps.join(",");

  useEffect(() => {
    let gone = false;
    fetch(`/api/household/report?steps=${key}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (gone) return;
        const answers = data && data.role !== "alone" ? (data.answers as Answers) : null;
        setState({
          loading: false,
          pair: answers && Object.keys(answers).length ? { name: data.name ?? "your partner", theirs: answers } : null,
        });
      })
      .catch(() => {
        // No second voice rather than no document.
        if (!gone) setState({ loading: false, pair: null });
      });
    return () => {
      gone = true;
    };
  }, [key]);

  return state;
}
