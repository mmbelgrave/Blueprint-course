"use client";
// Modules, level three (spec §6.9): the lessons of one step — the picture from
// each video with a tick on it once watched, and the step's workbook above them.
import Link from "next/link";
import { useParams } from "next/navigation";
import { ListHeading, ModuleHeader } from "@/components/module-header";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { journey } from "@/lib/content";
import { lessonsOf, moduleById, stateOf, stepProgress, watchedKey, workbookOf } from "@/lib/modules-app";

export default function StepLessons() {
  const { moduleId, stepId } = useParams<{ moduleId: string; stepId: string }>();
  const { statuses } = useApp();
  const course = moduleById(moduleId);
  const entitlements: never[] = [];
  const number = Number(String(stepId).replace("step-", ""));
  const step = journey.steps.find((s) => s.number === number);

  if (!course || !step || !step.in_app || stateOf(course, entitlements) !== "open") {
    return (
      <Shell quiet ownHeader>
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
  const workbook = workbookOf(stepId);

  return (
    <Shell quiet ownHeader>
      <RequireUser>
        <article className="space-y-6">
          <ModuleHeader
            back={`/modules/${course.id}`}
            backLabel={`Back to ${course.name}`}
            title={`Step ${step.number} · ${step.title}`}
            blurb={step.question}
            percent={lessons.length > 0 ? progress.percent : undefined}
          />

          {workbook?.file && (
            <section className="rounded-2xl bg-white p-5 text-center sm:text-left">
              <h2 className="text-lg text-pine">The workbook</h2>
              <p className="mt-1 text-sm text-stone">
                {workbook.name}
                {workbook.updated ? ` · updated ${workbook.updated}` : ""}
              </p>
              <p className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <a
                  className="btn btn-ghost"
                  href={`/api/workbook?step=${stepId}&open=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open
                </a>
                <a className="btn btn-ghost" href={`/api/workbook?step=${stepId}`}>
                  Download
                </a>
              </p>
            </section>
          )}

          <ListHeading title="The lessons" count={lessons.length} />

          <ol className="space-y-3">
            {lessons.map((l) => {
              const watched = statuses[watchedKey(course.id, stepId, l.id)] === "done";
              return (
                <li key={l.id}>
                  <Link
                    href={`/modules/${course.id}/${stepId}/${l.id}`}
                    className="flex items-center gap-3 rounded-2xl border-b-2 border-ochre/35 bg-white p-3 transition hover:border-ochre"
                  >
                    <span className="w-6 shrink-0 text-lg font-semibold text-ochre tabular">{l.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-pine">{l.title}</span>
                      {l.time && <span className="block text-sm text-stone">{l.time}</span>}
                    </span>
                    {/* The picture from the video, with the play ring and the tick on it. */}
                    <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-sage">
                      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-pine/50 text-[0.6rem] text-pine">
                          ▶
                        </span>
                      </span>
                      {watched && (
                        <span
                          className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ochre text-[0.7rem] font-bold text-white"
                          aria-label="Watched"
                          title="Watched"
                        >
                          ✓
                        </span>
                      )}
                    </span>
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
