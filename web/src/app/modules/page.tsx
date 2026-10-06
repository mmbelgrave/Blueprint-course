"use client";
// Modules, level one (spec §6.9): what this person can open, and how far they
// have got through watching it.
import Link from "next/link";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { modules, noteFor, partsOf, progressOf, stateOf } from "@/lib/modules-app";
import { PRODUCT } from "@/lib/content";

export default function Modules() {
  const { statuses } = useApp();
  // Entitlements arrive with purchases (§6.1). Until then nothing is withheld,
  // and the access layer already knows that, so this asks it rather than guessing.
  const entitlements: never[] = [];

  return (
    <Shell>
      <RequireUser>
        <section className="space-y-6">
          <header>
            <h1 className="text-3xl text-pine">Modules</h1>
            <p className="mt-2 text-lg text-stone">
              The videos and the workbooks. {PRODUCT.name} · {PRODUCT.edition}
            </p>
          </header>

          <ul className="space-y-4">
            {modules.map((m) => {
              const parts = partsOf(m);
              const state = stateOf(m, entitlements);
              const progress = progressOf(m, parts, statuses);
              const open = state === "open";

              const card = (
                <div
                  className={`rounded-2xl p-5 ${open ? "bg-white" : "border border-dashed border-line"}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className={`text-xl ${open ? "text-pine" : "text-stone"}`}>{m.name}</h2>
                    {state === "locked" && <span className="text-sm text-stone">Part of the course</span>}
                    {state === "not-released" && <span className="text-sm text-stone">{noteFor(m)}</span>}
                  </div>
                  {m.blurb && <p className="mt-1 text-stone">{m.blurb}</p>}

                  {open && parts.length > 0 && (
                    <p className="mt-3 flex items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-sage">
                        <span
                          className={`block h-full rounded-full ${progress.complete ? "bg-success" : "bg-ochre"}`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </span>
                      <span className="text-sm font-semibold text-stone tabular">{progress.percent}%</span>
                    </p>
                  )}
                  {open && parts.length > 0 && (
                    <p className="mt-1 text-sm text-stone">
                      {progress.done} of {progress.total} watched
                    </p>
                  )}
                </div>
              );

              return <li key={m.id}>{open ? <Link href={`/modules/${m.id}`}>{card}</Link> : card}</li>;
            })}
          </ul>

          <p className="text-sm text-stone">
            This counts the videos you have watched. Your answers have their own progress, under{" "}
            <Link href="/dashboard" className="underline">
              Exercises
            </Link>
            .
          </p>
        </section>
      </RequireUser>
    </Shell>
  );
}
