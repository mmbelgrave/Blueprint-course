"use client";
// Where am I, and how do I get somewhere else.
//   PartRail   — the whole step as one line: a segment per part, sized by how
//                long the part is, with an ochre marker on the part you are in.
//   PageChips  — the pages of one part, with their state.
//   WhereNext  — the block at the foot of a workbook page.
// The rail is a line diagram (Pine on Sand, Ochre marking the one point that
// matters), not the brand motif: the motif must always be exactly three lines.
import Link from "next/link";
import type { ExerciseStatus } from "@/lib/backend";
import { displayNumber, displayTitle, partItems, type Exercise, type Part, type StepContent } from "@/lib/content";
import { exerciseHref, partProgress, stepHref } from "@/lib/progress";

type Statuses = Record<string, ExerciseStatus>;

const stateOf = (id: string, statuses: Statuses, here: boolean) =>
  here ? "here" : statuses[id] === "done" ? "done" : statuses[id] ? "started" : "open";

/** ✓ done · ½ started · nothing yet. Never colour alone. */
const CHIP: Record<string, string> = {
  here: "bg-pine text-sand border-pine",
  done: "border-pine text-pine",
  started: "border-pine text-pine",
  open: "border-line text-stone bg-white",
};

function ChipMark({ state }: { state: string }) {
  if (state === "done") return <span className="text-success" aria-hidden>✓</span>;
  if (state === "started") return <span className="text-stone" aria-hidden>½</span>;
  return null;
}

export function PageChips({
  step,
  part,
  statuses,
  currentId,
  lead,
}: {
  step: number;
  part: Part;
  statuses: Statuses;
  currentId?: string;
  lead?: string;
}) {
  const items = partItems(part);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {lead && <span className="mr-0.5 text-sm text-stone">{lead}</span>}
      {items.map((e) => {
        const state = stateOf(e.id, statuses, e.id === currentId);
        const label =
          e.id === currentId ? displayTitle(e) : displayNumber(e);
        return (
          <Link
            key={e.id}
            href={exerciseHref(step, part.id, e.id)}
            aria-current={e.id === currentId ? "page" : undefined}
            title={displayTitle(e)}
            className={`inline-flex items-center gap-1 rounded-lg border-[1.75px] px-2 py-0.5 text-sm font-medium ${CHIP[state]}`}
          >
            <ChipMark state={state} />
            {label}
            {e.optional && <span className="text-xs font-normal opacity-70">optional</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** One line for the whole step: how far you are, and which part you are in. */
export function PartRail({
  content,
  statuses,
  currentPartId,
}: {
  content: StepContent;
  statuses: Statuses;
  currentPartId?: string;
}) {
  const n = content.step.number;
  const parts = content.parts;
  const totals = parts.map((p) => partItems(p).length);
  let done = 0;
  let total = 0;
  for (const p of parts) {
    const pp = partProgress(p, statuses);
    done += pp.done;
    total += pp.total;
  }

  return (
    <section aria-label={`Where you are in Step ${n}`} className="print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="display text-lg text-pine">
          Step {n} · {content.step.title}
        </h2>
        <p className="text-sm text-stone">
          {done} of {total} pages done
        </p>
      </div>

      <div className="mt-2 flex gap-1.5" aria-hidden>
        {parts.map((part, i) => {
          const items = partItems(part);
          const doneHere = items.filter((e) => statuses[e.id] === "done").length;
          const here = part.id === currentPartId;
          const share = items.length ? (doneHere / items.length) * 100 : 0;
          return (
            <div key={part.id} className="relative h-1.5 rounded-full bg-sage" style={{ flex: totals[i] }}>
              <div className="h-full rounded-full bg-pine" style={{ width: `${share}%` }} />
              {here && (
                <span
                  className="absolute -top-1 h-3.5 w-[7px] -translate-x-1/2 rounded-full bg-ochre"
                  style={{ left: `${Math.max(share, 4)}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 hidden gap-1.5 sm:flex">
        {parts.map((part, i) => (
          <Link
            key={part.id}
            href={exerciseHref(n, part.id, partItems(part)[0].id)}
            style={{ flex: totals[i] }}
            className={`truncate text-center text-xs hover:underline ${
              part.id === currentPartId ? "font-semibold text-ochre" : "text-stone"
            }`}
          >
            {part.id.includes("p0") ? "Start" : `${part.number} · ${part.title}`}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** The foot of a workbook page: this part's pages, one step back or on, and out. */
export function WhereNext({
  content,
  part,
  current,
  previous,
  next,
  statuses,
}: {
  content: StepContent;
  part: Part;
  current: Exercise;
  previous?: { part: Part; exercise: Exercise };
  next?: { part: Part; exercise: Exercise };
  statuses: Statuses;
}) {
  const n = content.step.number;
  return (
    <nav aria-label="Where to next" className="mt-10 border-t border-line pt-5 print:hidden">
      <PageChips step={n} part={part} statuses={statuses} currentId={current.id} lead={`${part.label}:`} />

      <div className="mt-4 flex flex-wrap gap-3">
        {previous ? (
          <Link href={exerciseHref(n, previous.part.id, previous.exercise.id)} className="btn btn-ghost flex-1 sm:flex-none">
            ← {displayTitle(previous.exercise)}
          </Link>
        ) : (
          <Link href={stepHref(n)} className="btn btn-ghost flex-1 sm:flex-none">
            ← Step overview
          </Link>
        )}
        {next ? (
          <Link href={exerciseHref(n, next.part.id, next.exercise.id)} className="btn btn-primary flex-1 sm:flex-none">
            {next.part.id !== part.id ? `${next.part.label} · ${next.part.title}` : displayTitle(next.exercise)} →
          </Link>
        ) : (
          <Link href={stepHref(n)} className="btn btn-primary flex-1 sm:flex-none">
            Finish this step →
          </Link>
        )}
        {/* One way out, after the step back and forward: the whole road. */}
        <Link href="/dashboard" className="btn btn-ghost flex-1 sm:flex-none">
          All steps
        </Link>
      </div>

    </nav>
  );
}
