"use client";
/*
 * Modules, level two (spec §6.9). What this shows depends on the kind:
 *
 *   a phase           its steps
 *   the Introduction  the lesson itself, since it has nothing underneath it
 *   free material     whatever is on offer
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lesson } from "@/components/lesson";
import { ModuleHeader } from "@/components/module-header";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { lessonKey, moduleById, phaseProgress, stateOf, stepProgress, stepsOfPhase } from "@/lib/modules-app";

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { statuses } = useApp();
  const course = moduleById(moduleId);
  const entitlements: never[] = [];

  if (!course || stateOf(course, entitlements) !== "open") {
    return (
      <Shell quiet>
        <RequireUser>
          <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 text-center">
            <h1 className="text-2xl text-pine">{course?.name ?? "That module"} is not open</h1>
            <Link href="/modules" className="btn btn-primary">
              Back to the modules
            </Link>
          </div>
        </RequireUser>
      </Shell>
    );
  }

  const back = null;

  const header = (
    <ModuleHeader
      back="/modules"
      backLabel="Back to the modules"
      title={course.name}
      blurb={course.edition ? `${course.edition} · ${course.blurb ?? ""}`.replace(/ · $/, "") : course.blurb}
      percent={course.kind === "phase" ? phaseProgress(course, statuses).percent : undefined}
    />
  );

  // The Introduction is a lesson on its own: a video and a workbook, no exercises.
  if (course.kind === "lesson") {
    return (
      <Shell quiet>
        <RequireUser>
          <article className="space-y-6">
            {back}
            {header}
            <Lesson
              video={course.video}
              videoKey={lessonKey(course.id)}
              workbook={course.workbook}
              workbookHref={course.workbook?.file ? `/api/workbook?module=${course.id}` : undefined}
            />
          </article>
        </RequireUser>
      </Shell>
    );
  }

  if (course.kind === "free") {
    const items = course.items ?? [];
    return (
      <Shell quiet>
        <RequireUser>
          <article className="space-y-6">
            {back}
            {header}
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-5 text-stone">
                The first free exercise is being prepared. It will appear here.
              </p>
            ) : (
              <ul className="space-y-4">
                {items.map((i) => (
                  <li key={i.id} className="rounded-2xl bg-white p-5 text-center sm:text-left">
                    <h2 className="text-xl text-pine">{i.title}</h2>
                    {i.blurb && <p className="mt-1 text-stone">{i.blurb}</p>}
                    <p className="mt-4 flex justify-center sm:justify-start">
                      {i.pdf ? (
                        <a
                          className="btn btn-primary"
                          href={`/api/workbook?free=${i.id}&open=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Do the exercise
                        </a>
                      ) : (
                        <Link className="btn btn-primary" href={i.href ?? "#"}>
                          Do the exercise
                        </Link>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </RequireUser>
      </Shell>
    );
  }

  const steps = stepsOfPhase(course);

  return (
    <Shell quiet>
      <RequireUser>
        <article className="space-y-6">
          {back}
          {header}

          <ol className="space-y-3">
            {steps.map((s) => {
              const progress = s.released ? stepProgress(course.id, s.number, statuses) : null;
              const inside = (
                <>
                  <div className="flex items-start gap-4">
                    <span className="w-7 shrink-0 text-lg font-semibold text-ochre tabular">{s.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-semibold ${s.released ? "text-pine" : "text-stone"}`}>
                        {s.title}
                      </span>
                      <span className="block text-sm text-stone">{s.question}</span>
                      {!s.released && <span className="mt-1 block text-sm text-stone">coming soon</span>}
                    </span>
                    {progress?.complete && <span className="shrink-0 text-success">✓</span>}
                  </div>
                  {progress && progress.total > 0 && (
                    <>
                      <p className="mt-3 flex items-center gap-3">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-sage">
                          <span
                            className={`block h-full rounded-full ${progress.complete ? "bg-success" : "bg-ochre"}`}
                            style={{ width: `${progress.percent}%` }}
                          />
                        </span>
                        <span className="text-sm font-semibold text-stone tabular">{progress.percent}%</span>
                      </p>
                      <p className="mt-1 text-sm text-stone">
                        {progress.done} of {progress.total} watched
                      </p>
                    </>
                  )}
                </>
              );
              const card = `block rounded-2xl p-4 ${s.released ? "bg-white" : "border border-dashed border-line"}`;
              return (
                <li key={s.id}>
                  {s.released ? (
                    <Link href={`/modules/${course.id}/${s.id}`} className={card}>
                      {inside}
                    </Link>
                  ) : (
                    <div className={card}>{inside}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </article>
      </RequireUser>
    </Shell>
  );
}
