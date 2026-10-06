"use client";
// Modules, level two (spec §6.9): the parts inside one module, each with what
// it is called, the picture from its video, and whether it has been watched.
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { moduleById, partsOf, progressOf, stateOf, watchedKey } from "@/lib/modules-app";

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { statuses } = useApp();
  const course = moduleById(moduleId);
  const entitlements: never[] = [];

  if (!course || stateOf(course, entitlements) !== "open") {
    return (
      <Shell>
        <RequireUser>
          <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 text-center">
            <h1 className="text-2xl text-pine">Not open yet</h1>
            <p>{course ? "This module is part of the course." : "That module does not exist."}</p>
            <Link href="/modules" className="btn btn-primary">
              Back to the modules
            </Link>
          </div>
        </RequireUser>
      </Shell>
    );
  }

  const parts = partsOf(course);
  const progress = progressOf(course, parts, statuses);

  return (
    <Shell>
      <RequireUser>
        <article className="space-y-6">
          <header>
            <p className="text-sm">
              <Link href="/modules" className="text-pine hover:underline">
                ← Modules
              </Link>
            </p>
            <h1 className="mt-2 text-3xl text-pine">{course.name}</h1>
            {course.blurb && <p className="mt-1 text-lg text-stone">{course.blurb}</p>}
            {parts.length > 0 && (
              <p className="mt-3 text-sm text-stone">
                {progress.done} of {progress.total} watched · {progress.percent}%
              </p>
            )}
          </header>

          <ol className="space-y-3">
            {parts.map((p, i) => {
              const watched = statuses[watchedKey(course.id, p.id)] === "done";
              return (
                <li key={p.id}>
                  <Link
                    href={`/modules/${course.id}/${p.id}`}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 transition hover:ring-1 hover:ring-pine"
                  >
                    <span className="w-6 shrink-0 text-lg font-semibold text-ochre tabular">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-pine">{p.title}</span>
                      <span className="block text-sm text-stone">
                        {p.video?.url
                          ? `Video${p.video.length ? ` · ${p.video.length}` : ""}`
                          : "Video being recorded"}
                      </span>
                    </span>
                    {/* The thumbnail stands in until the videos are made. */}
                    <span className="relative hidden h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-pine sm:block">
                      {p.video?.url && (
                        <span className="absolute inset-0 flex items-center justify-center text-xl text-sand" aria-hidden>
                          ▶
                        </span>
                      )}
                    </span>
                    {watched && (
                      <span className="shrink-0 text-success" title="Watched" aria-label="Watched">
                        ✓
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>

          {parts.length === 0 && <p className="text-stone">The parts of this module are being written.</p>}
        </article>
      </RequireUser>
    </Shell>
  );
}
