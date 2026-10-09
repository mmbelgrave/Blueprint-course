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
import { ResultCard } from "@/components/result-card";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { stepFor } from "@/lib/access-app";
import { stepsFinished, type Answers as BlueprintAnswers } from "@/lib/blueprint";
import {
  buyUrl,
  freeThingsIn,
  isFree,
  lessonKey,
  moduleById,
  phaseProgress,
  stateOf,
  stepProgress,
  stepsOfPhase,
} from "@/lib/modules-app";

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { answers, entitlements, statuses } = useApp();
  const course = moduleById(moduleId);

  const free = isFree(entitlements);
  const state = stateOf(course!, entitlements);
  // "buy" still opens: a phase has to be seen before anyone buys it. "coming"
  // does not, because there is nothing behind the door yet.
  if (!course || state === "coming") {
    return (
      <Shell ownHeader>
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
      percent={course.kind === "phase" && !free ? phaseProgress(course, statuses).percent : undefined}
    />
  );

  // The Introduction is a lesson on its own: a video and a workbook, no exercises.
  if (course.kind === "lesson") {
    return (
      <Shell ownHeader>
        <RequireUser>
          <article className="space-y-6">
            {back}
            {header}
            <Lesson
              video={course.video}
              videoKey={lessonKey(course.id)}
              workbook={free ? undefined : course.workbook}
              workbookHref={
                !free && course.workbook?.file ? `/api/workbook?module=${course.id}` : undefined
              }
            />
          </article>
        </RequireUser>
      </Shell>
    );
  }

  if (course.kind === "free") {
    const items = course.items ?? [];
    return (
      <Shell ownHeader>
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
                  <li key={i.id} className="rounded-2xl bg-white p-5 text-center">
                    <h2 className="text-xl text-pine">{i.title}</h2>
                    {i.blurb && <p className="mt-1 text-stone">{i.blurb}</p>}
                    <p className="mt-4 flex flex-wrap justify-center gap-2">
                      {i.pdf ? (
                        <>
                          <a
                            className="btn btn-primary"
                            href={`/api/workbook?free=${i.id}&open=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                          <a className="btn btn-ghost" href={`/api/workbook?free=${i.id}`}>
                            Download
                          </a>
                        </>
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

  // A free account sees the one or two things that are open to it, with no
  // steps around them: there is no journey to show someone who owns none of it.
  if (free) {
    const open = freeThingsIn(course);
    return (
      <Shell ownHeader>
        <RequireUser>
          <article className="space-y-6">
            {header}

            {open.length > 0 && (
              <ul className="space-y-3">
                {open.map((o) => (
                  <li key={o.href}>
                    <Link
                      href={o.href}
                      className="flex items-center gap-3 rounded-2xl border-b-2 border-ochre/35 bg-white p-4 transition hover:border-ochre"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-pine">{o.title}</span>
                        <span className="block text-sm text-stone">{o.note} · free</span>
                      </span>
                      <span aria-hidden className="shrink-0 text-ochre">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <section className="rounded-2xl bg-sage p-5 text-center">
              <h2 className="text-lg text-pine">The rest of this phase is the course</h2>
              <p className="mt-1 text-stone">
                Every step with its video, its workbook as a PDF, the exercises in the app, and your AI partner beside
                you while you write.
              </p>
              <p className="mt-3">
                <a className="btn btn-primary" href={buyUrl} target="_blank" rel="noopener noreferrer">
                  Get Phase 1
                </a>
              </p>
            </section>
          </article>
        </RequireUser>
      </Shell>
    );
  }

  const steps = stepsOfPhase(course);
  /*
   * The Blueprint is made of the step results, so it waits for them. Only the
   * steps this person owns and can open count: somebody who bought Phase 1
   * while Step 3 was still being written is not kept waiting for a step that
   * does not exist yet.
   */
  const finished = stepsFinished(answers as BlueprintAnswers);
  const wanted = steps.filter((s) => s.released && stepFor(s.number, entitlements).open);
  const missing = wanted.filter((s) => !finished.find((f) => f.step === s.number)?.finished);

  return (
    <Shell ownHeader>
      <RequireUser>
        <article className="space-y-6">
          {back}
          {header}

          <ol className="space-y-3">
            {steps.map((s) => {
              const verdict = stepFor(s.number, entitlements);
              const progress = verdict.open ? stepProgress(course.id, s.number, statuses) : null;
              const inside = (
                <>
                  <div className="flex items-start gap-4">
                    <span className="w-7 shrink-0 text-lg font-semibold text-ochre tabular">{s.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-semibold ${s.released ? "text-pine" : "text-stone"}`}>
                        {s.title}
                      </span>
                      <span className="block text-sm text-stone">{s.question}</span>
                      {!verdict.open && (
                        <span className="mt-1 block text-sm text-stone">
                          {verdict.why === "not-bought" ? "part of the course" : "coming soon"}
                        </span>
                      )}
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
              const card = `block rounded-2xl p-4 ${verdict.open ? "bg-white" : "border border-dashed border-line"}`;
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

          {/* The document the website promises: "you finish with your own
              blueprint". It waits for the step results it is made of. */}
          {course.kind === "phase" && state === "open" && (
            <ResultCard
              title={`My Blueprint · ${course.name}`}
              blurb="Your step results in one document: your decision, your money from first guess to checked figure, what does not line up yet, and the dates you set yourself."
              href={`/phase/${course.id.replace("phase-", "")}/print`}
              ready={wanted.length > 0 && missing.length === 0}
              waiting={
                wanted.length === 0
                  ? "It appears here once the steps of this phase are open to you."
                  : `It appears here once you have finished ${
                      missing.length === 1
                        ? `Step ${missing[0].number}`
                        : `Steps ${missing.map((s) => s.number).join(", ").replace(/, (d+)$/, " and $1")}`
                    }.`
              }
            />
          )}

          {state === "buy" && (
            <section className="rounded-2xl bg-sage p-5 text-center">
              <h2 className="text-lg text-pine">This phase is part of the course</h2>
              <p className="mt-1 text-stone">
                The videos, the workbooks and the exercises for every step above. One payment, yours to keep.
              </p>
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
