"use client";
/**
 * "You and Ben", on the step page (spec §6.8, slice 2).
 *
 * The one gathered place, and deliberately not a fifth tab: it sits beside the
 * step's own result, which is where the conversation at the end of a step
 * happens. It carries no words of theirs, only which pages are ready.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { fetchStepCompare, type StepCompare } from "@/lib/compare-client";
import { displayTitle, partItems, type StepContent } from "@/lib/content";
import { exerciseHref } from "@/lib/progress";

type Row = { id: string; title: string; href: string };

export function StepTogether({ step }: { step: StepContent }) {
  const { household } = useApp();
  const [state, setState] = useState<StepCompare | null>(null);
  const number = step.step.number;

  const load = useCallback(() => fetchStepCompare(number), [number]);

  useEffect(() => {
    let gone = false;
    load().then((next) => {
      if (!gone && next) setState(next);
    });
    return () => {
      gone = true;
    };
  }, [load]);

  if (household.role === "alone" || !state) return null;

  const where = new Map<string, Row>();
  for (const part of step.parts) {
    for (const item of partItems(part)) {
      where.set(item.id, {
        id: item.id,
        title: displayTitle(item),
        href: exerciseHref(number, part.id, item.id),
      });
    }
  }

  const pick = (test: (p: { mineWritten: boolean; theirsWritten: boolean; may: boolean }) => boolean): Row[] =>
    Object.entries(state.pages)
      .filter(([, p]) => test(p))
      .map(([id]) => where.get(id))
      .filter((row): row is Row => Boolean(row));

  const ready = pick((p) => p.may);
  const yourTurn = pick((p) => !p.may && p.theirsWritten && !p.mineWritten);
  const waitingOnThem = pick((p) => !p.may && p.mineWritten && !p.theirsWritten);

  if (ready.length === 0 && yourTurn.length === 0 && waitingOnThem.length === 0) return null;

  const them = state.theirName ?? household.otherName ?? "your partner";
  const list = (rows: Row[]) => (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={row.href} className="text-pine underline">
            {row.title}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="mt-6 rounded-2xl bg-white p-5">
      <h2 className="text-lg font-semibold text-pine">You and {them}</h2>
      <p className="mt-1 text-sm text-stone">
        The pages you each answer yourself. You see each other&rsquo;s answers once you have both written.
      </p>
      {ready.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold text-success">Ready to compare</p>
          {list(ready)}
        </div>
      )}
      {yourTurn.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold text-ochre">{them} has written these. Your turn.</p>
          {list(yourTurn)}
        </div>
      )}
      {waitingOnThem.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold text-stone">Waiting for {them}</p>
          {list(waitingOnThem)}
        </div>
      )}
    </section>
  );
}
