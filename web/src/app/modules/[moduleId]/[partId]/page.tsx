"use client";
/*
 * Modules, level three (spec §6.9): one part of a module.
 *
 * The video first, then the two ways to do the work — the workbook to print and
 * write in, or the exercises in the app. Neither is locked behind the video:
 * the workbook is something people paid for, and holding it back would break a
 * promise the website already made. It is put in order, not under guard.
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { VideoSlot } from "@/components/video-slot";
import { useApp } from "@/lib/app-state";
import { moduleById, partsOf, stateOf, watchedKey } from "@/lib/modules-app";

export default function ModulePart() {
  const { moduleId, partId } = useParams<{ moduleId: string; partId: string }>();
  const { statuses, setStatus } = useApp();
  const [problem, setProblem] = useState(false);
  const course = moduleById(moduleId);
  const entitlements: never[] = [];

  if (!course || stateOf(course, entitlements) !== "open") {
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

  const parts = partsOf(course);
  const index = parts.findIndex((p) => p.id === partId);
  const part = parts[index];

  if (!part) {
    return (
      <Shell>
        <RequireUser>
          <p>
            That part does not exist.{" "}
            <Link href={`/modules/${course.id}`} className="underline">
              Back to {course.name}
            </Link>
          </p>
        </RequireUser>
      </Shell>
    );
  }

  const key = watchedKey(course.id, part.id);
  const watched = statuses[key] === "done";
  const following = parts.slice(index + 1);
  const workbook = course.workbook;

  return (
    <Shell>
      <RequireUser>
        <article className="space-y-6">
          <p className="text-sm">
            <Link href={`/modules/${course.id}`} className="text-pine hover:underline">
              ← {course.name}
            </Link>
          </p>

          <VideoSlot video={part.video} id={key} />

          <header>
            <p className="text-sm font-semibold tracking-wide text-ochre">{course.name}</p>
            <h1 className="mt-1 text-3xl text-pine">{part.title}</h1>
            {part.blurb && <p className="mt-2 text-lg">{part.blurb}</p>}
          </header>

          {/* The two ways to do the work. Both are open; the order is the hint. */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5">
              <h2 className="text-lg text-pine">The workbook</h2>
              {workbook?.file ? (
                <>
                  <p className="mt-1 text-sm text-stone">
                    {workbook.name}
                    {workbook.updated ? ` · updated ${workbook.updated}` : ""}
                  </p>
                  <a className="btn btn-ghost mt-3" href={`/api/workbook?course=${course.id}`}>
                    Download the PDF
                  </a>
                </>
              ) : (
                <p className="mt-1 text-stone">{workbook?.name ?? "The workbook"} is being prepared.</p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5">
              <h2 className="text-lg text-pine">Or answer in the app</h2>
              {part.exerciseHref ? (
                <>
                  <p className="mt-1 text-sm text-stone">
                    The same questions, with your AI partner beside you and everything saved.
                  </p>
                  <Link className="btn btn-primary mt-3" href={part.exerciseHref}>
                    To the exercises
                  </Link>
                </>
              ) : (
                <p className="mt-1 text-stone">This part has no exercises: it is there to watch and read.</p>
              )}
            </div>
          </section>

          <label className="flex items-center gap-3 rounded-2xl border border-line p-4">
            <input
              type="checkbox"
              className="h-5 w-5 accent-pine"
              checked={watched}
              onChange={async (e) => {
                const ok = await setStatus(key, e.target.checked ? "done" : "not_started");
                setProblem(!ok);
              }}
            />
            <span>
              <span className="font-medium">Module completed</span>
              <span className="block text-sm text-stone">
                This moves the progress on the Modules screen. Your answers are counted separately.
              </span>
            </span>
          </label>
          {problem && (
            <p role="alert" className="text-sm text-ochre">
              That was not saved. Please check your internet and try again.
            </p>
          )}

          {following.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl text-pine">Following lessons</h2>
              <ol className="space-y-2">
                {following.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      href={`/modules/${course.id}/${p.id}`}
                      className="flex items-center gap-4 rounded-xl bg-white p-3 transition hover:ring-1 hover:ring-pine"
                    >
                      <span className="w-6 shrink-0 font-semibold text-ochre tabular">{index + i + 2}</span>
                      <span className="min-w-0 flex-1 font-medium text-pine">{p.title}</span>
                      {statuses[watchedKey(course.id, p.id)] === "done" && <span className="text-success">✓</span>}
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
