"use client";
// Where am I, and how do I get somewhere else.
//   PartRail   — the whole step as one line: a segment per part, sized by how
//                long the part is, with an ochre marker on the part you are in.
// The rail is a line diagram (Pine on Sand, Ochre marking the one point that
// matters), not the brand motif: the motif must always be exactly three lines.
import Link from "next/link";
import type { ExerciseStatus } from "@/lib/backend";
import { partItems, type StepContent } from "@/lib/content";
import { exerciseHref, partProgress } from "@/lib/progress";

type Statuses = Record<string, ExerciseStatus>;

/** One line for the whole step: how far you are, and which part you are in. */
export function PartRail({
  content,
  statuses,
  currentPartId,
  currentExerciseId,
}: {
  content: StepContent;
  statuses: Statuses;
  currentPartId?: string;
  /** The page being read, so the marker can stand on it. */
  currentExerciseId?: string;
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
          /*
           * The filled part of the line is what is done; the marker is where
           * you are standing. They are not the same thing, and tying the
           * marker to the first made it sit at the end of the part for
           * somebody rereading a page they had finished (Mwata, 20 October:
           * "at 1.1 it already moves all the way to the end"). It now stands
           * on the page being read, in the middle of that page's share of the
           * line, and falls back to the progress only when no page is named.
           */
          const at = items.findIndex((e) => e.id === currentExerciseId);
          const where =
            here && at >= 0 ? ((at + 0.5) / items.length) * 100 : Math.max(share, 4);
          return (
            <div key={part.id} className="relative h-1.5 rounded-full bg-sage" style={{ flex: totals[i] }}>
              <div className="h-full rounded-full bg-pine" style={{ width: `${share}%` }} />
              {here && (
                <span
                  className="absolute -top-1 h-3.5 w-[7px] -translate-x-1/2 rounded-full bg-ochre"
                  style={{ left: `${where}%` }}
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
