"use client";
// Modules, level three (spec §6.9): the lessons of one step, each with its
// name, the picture from its video, and a tick once it has been watched.
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { journey } from "@/lib/content";
import { lessonsOf, moduleById, stateOf, stepProgress, watchedKey } from "@/lib/modules-app";

export default function StepLessons() {
  const { moduleId, stepId } = useParams<{ moduleId: string; stepId: string }>();
  const { statuses } = useApp();
  const course = moduleById(moduleId);
  const entitlements: never[] = [];
  const number = Number(String(stepId).replace("step-", ""));
  const step = journey.steps.find((s) => s.number === number);

  if (!course || !step || !step.in_app || stateOf(course, entitlements) !== "open") {
    return (
      <Shell>
        <RequireUser>
          <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 text-center">
            <h1 className="text-2xl text-pine">Not open yet</h1>
            <Link href="/modules" className="btn btn-primary">
              Back to the modules
            </Link>
          </div>
        </RequireUser>
      </Shell>
    );
  }

  const lessons = lessonsOf(number);
  const progress = stepProgress(course.id, number, statuses);

  return (
    <Shell>
      <RequireUser>
        <article className="space-y-6">
          <p className="text-sm">
            <Link href={`/modules/${course.id}`} className="text-pine hover:underline">
              ← {course.name}
            </Link>
          </p>

          <header>
            <h1 className="mt-2 text-3xl text-pine">
              Step {step.number} · {step.title}
            </h1>
            <p className="mt-1 text-lg text-stone">{step.question}</p>
            {lessons.length > 0 && (
              <p className="mt-3 text-sm text-stone">
                {progress.done} of {progress.total} watched · {progress.percent}%
              </p>
            )}
          </header>

          <ol className="space-y-3">
            {lessons.map((l, i) => {
              const watched = statuses[watchedKey(course.id, stepId, l.id)] === "done";
              return (
                <li key={l.id}>
                  <Link
                    href={`/modules/${course.id}/${stepId}/${l.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 transition hover:ring-1 hover:ring-pine"
                  >
                    <span className="w-6 shrink-0 text-lg font-semibold text-ochre tabular">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-pine">{l.title}</span>
                      <span className="block text-sm text-stone">
                        {l.video?.url ? `Video${l.video.length ? ` · ${l.video.length}` : ""}` : "Video being recorded"}
                      </span>
                    </span>
                    {/* The picture from the video; a plain frame until there is one. */}
                    <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-pine">
                      {l.video?.url && (
                        <span className="absolute inset-0 flex items-center justify-center text-lg text-sand" aria-hidden>
                          ▶
                        </span>
                      )}
                    </span>
                    {watched && (
                      <span className="shrink-0 text-success" aria-label="Watched" title="Watched">
                        ✓
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </article>
      </RequireUser>
    </Shell>
  );
}
