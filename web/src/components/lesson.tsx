"use client";
/*
 * One lesson (spec §6.9): the video, the workbook, and the way into the
 * exercises. Used by the Introduction, which has no exercises, and by every
 * part of every step, which has.
 *
 * Nothing is locked behind the video. The workbook is something people paid
 * for, and the website promises it on payment; the order of the page is the
 * hint, not a gate.
 */
import Link from "next/link";
import { useState } from "react";
import { VideoSlot } from "@/components/video-slot";
import { useApp } from "@/lib/app-state";
import type { ModuleVideo, Workbook } from "@/lib/modules";

export function Lesson({
  video,
  videoKey,
  workbook,
  workbookHref,
  exerciseHref,
}: {
  video?: ModuleVideo;
  /** Where "watched" is remembered for this lesson. */
  videoKey: string;
  workbook?: Workbook;
  /** Only when there is a file to fetch. */
  workbookHref?: string;
  exerciseHref?: string;
}) {
  const { statuses, setStatus } = useApp();
  const [problem, setProblem] = useState(false);
  const done = statuses[videoKey] === "done";

  return (
    <div className="space-y-6">
      <VideoSlot video={video} id={videoKey} plain />

      {/* The one thing to press when the video is finished. */}
      <p className="flex justify-center">
        <button
          className={done ? "btn btn-ghost" : "btn btn-primary"}
          onClick={async () => {
            const ok = await setStatus(videoKey, done ? "not_started" : "done");
            setProblem(!ok);
          }}
        >
          {done ? "✓ Completed — undo" : "Mark as completed"}
        </button>
      </p>
      {problem && (
        <p role="alert" className="text-center text-sm text-ochre">
          That was not saved. Please check your internet and try again.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 text-center sm:text-left">
          <h2 className="text-lg text-pine">The workbook</h2>
          {workbookHref ? (
            <>
              <p className="mt-1 text-sm text-stone">
                {workbook?.name}
                {workbook?.updated ? ` · updated ${workbook.updated}` : ""}
              </p>
              <p className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <a className="btn btn-ghost" href={`${workbookHref}&open=1`} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
                <a className="btn btn-ghost" href={workbookHref}>
                  Download
                </a>
              </p>
            </>
          ) : (
            <p className="mt-1 text-stone">{workbook?.name ?? "The workbook"} is being prepared.</p>
          )}
        </section>

        {exerciseHref && (
          <section className="rounded-2xl bg-white p-5 text-center sm:text-left">
            <h2 className="text-lg text-pine">Or answer in the app</h2>
            <p className="mt-1 text-sm text-stone">
              The same questions, with your AI partner beside you and everything saved.
            </p>
            <p className="mt-3 flex justify-center sm:justify-start">
              <Link className="btn btn-primary" href={exerciseHref}>
                To the exercises
              </Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
