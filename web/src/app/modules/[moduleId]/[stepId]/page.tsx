"use client";
// Modules, level three (spec §6.9): the lessons of one step — the picture from
// each video with a tick on it once watched, and the step's workbook above them.
import Link from "next/link";
import { useParams } from "next/navigation";
import { ListHeading, ModuleHeader } from "@/components/module-header";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { journey } from "@/lib/content";
import { lessonFor, stepFor } from "@/lib/access-app";
import { buyUrl, lessonsOf, moduleById, stateOf, stepProgress, watchedKey, workbookOf } from "@/lib/modules-app";

export default function StepLessons() {
  const { moduleId, stepId } = useParams<{ moduleId: string; stepId: string }>();
  const { entitlements, statuses } = useApp();
  const course = moduleById(moduleId);
  const number = Number(String(stepId).replace("step-", ""));
  const step = journey.steps.find((s) => s.number === number);

  if (!course || !step || !step.in_app || stateOf(course, entitlements) === "coming") {
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
  const mine = stepFor(number, entitlements).open;
  const workbook = mine ? workbookOf(stepId) : undefined;

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
              const open = lessonFor(stepId, l.id, number, entitlements).open;
              const inside = (
                <>
                  <span className={`w-6 shrink-0 text-lg font-semibold tabular ${open ? "text-ochre" : "text-stone"}`}>
                    {l.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${open ? "text-pine" : "text-stone"}`}>{l.title}</span>
                    {l.time && <span className="block text-sm text-stone">{l.time}</span>}
                    {!mine && (
                      <span className="block text-sm text-stone">{open ? "free to watch" : "part of the course"}</span>
                    )}
                  </span>
                  {/* The picture from the video, with the play ring and the tick on it. */}
                  <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-sage">
                    <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-pine/50 text-[0.6rem] text-pine">
                        {open ? "▶" : "🔒"}
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
                </>
              );
              return (
                <li key={l.id}>
                  {open ? (
                    <Link
                      href={`/modules/${course.id}/${stepId}/${l.id}`}
                      className="flex items-center gap-3 rounded-2xl border-b-2 border-ochre/35 bg-white p-3 transition hover:border-ochre"
                    >
                      {inside}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-3">
                      {inside}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {!mine && (
            <section className="rounded-2xl bg-sage p-5 text-center">
              <h2 className="text-lg text-pine">The rest of this step is part of the course</h2>
              <p className="mt-1 text-stone">Every lesson above, the workbook as a PDF, and the exercises in the app.</p>
              <p className="mt-3">
                <a className="btn btn-primary" href={buyUrl} target="_blank" rel="noopener noreferrer">
                  Get Phase 1
                </a>
              </p>
            </section>
          )}
        </article>
      </RequireUser>
    </Shell>
  );
}
