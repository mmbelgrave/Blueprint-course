"use client";
// Modules, level four (spec §6.9): one lesson — the video, the workbook, the
// way into the exercises, and the lessons that follow.
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lesson } from "@/components/lesson";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { journey } from "@/lib/content";
import { lessonsOf, moduleById, stateOf, watchedKey, workbookOf } from "@/lib/modules-app";

export default function LessonPage() {
  const { moduleId, stepId, lessonId } = useParams<{ moduleId: string; stepId: string; lessonId: string }>();
  const { statuses } = useApp();
  const course = moduleById(moduleId);
  const entitlements: never[] = [];
  const number = Number(String(stepId).replace("step-", ""));
  const step = journey.steps.find((s) => s.number === number);

  if (!course || !step || !step.in_app || stateOf(course, entitlements) !== "open") {
    return (
      <Shell quiet>
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
  const index = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[index];

  if (!lesson) {
    return (
      <Shell quiet>
        <RequireUser>
          <p className="text-center">
            That lesson does not exist.{" "}
            <Link href={`/modules/${course.id}/${stepId}`} className="underline">
              Back to Step {number}
            </Link>
          </p>
        </RequireUser>
      </Shell>
    );
  }

  const workbook = workbookOf(stepId);
  const following = lessons.slice(index + 1);

  return (
    <Shell quiet>
      <RequireUser>
        <article className="space-y-6">
          <p className="text-sm">
            <Link href={`/modules/${course.id}/${stepId}`} className="text-pine hover:underline">
              ← Step {step.number} · {step.title}
            </Link>
          </p>

          <header className="text-center sm:text-left">
            <p className="text-sm font-semibold tracking-wide text-ochre">
              Step {step.number} · {step.title}
            </p>
            <h1 className="mt-1 text-3xl text-pine">{lesson.title}</h1>
          </header>

          <Lesson
            video={lesson.video}
            videoKey={watchedKey(course.id, stepId, lesson.id)}
            workbook={workbook}
            workbookHref={workbook?.file ? `/api/workbook?step=${stepId}` : undefined}
            exerciseHref={lesson.exerciseHref}
          />

          {following.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl text-pine">Following lessons</h2>
              <ol className="space-y-2">
                {following.map((l, i) => (
                  <li key={l.id}>
                    <Link
                      href={`/modules/${course.id}/${stepId}/${l.id}`}
                      className="flex items-center gap-3 rounded-xl bg-white p-3 transition hover:ring-1 hover:ring-pine"
                    >
                      <span className="w-6 shrink-0 font-semibold text-ochre tabular">{index + i + 2}</span>
                      <span className="min-w-0 flex-1 font-medium text-pine">{l.title}</span>
                      <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-sage">
                        {l.video?.url && (
                          <span className="absolute inset-0 flex items-center justify-center text-sand" aria-hidden>
                            ▶
                          </span>
                        )}
                      </span>
                      {statuses[watchedKey(course.id, stepId, l.id)] === "done" && (
                        <span className="shrink-0 text-success">✓</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </article>
      </RequireUser>
    </Shell>
  );
}
