"use client";
/*
 * The head of a Modules screen (spec §6.9), after the shape Mwata asked for: a
 * round way back on the left, the mark in the middle, and a ring on the right
 * showing how far through this is. Then the title and its one line, centred.
 */
import Link from "next/link";
import { Mark } from "@/components/brand";

/** How far through, as a ring. The number sits inside it. */
export function ProgressRing({ percent, size = 48 }: { percent: number; size?: number }) {
  const r = (size - 7) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, percent)) / 100;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-ochre)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${circumference * filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ochre tabular">
        {Math.round(percent)}%
      </span>
    </span>
  );
}

export function ModuleHeader({
  back,
  backLabel,
  title,
  blurb,
  percent,
}: {
  back: string;
  backLabel: string;
  title: string;
  blurb?: string;
  /** Left out where there is nothing to be part-way through. */
  percent?: number;
}) {
  return (
    <header className="space-y-4 border-b border-line pb-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={back}
          aria-label={backLabel}
          title={backLabel}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line text-xl text-pine transition hover:border-pine"
        >
          <span aria-hidden>‹</span>
        </Link>

        <Mark size={50} />

        {percent === undefined ? (
          <span className="h-12 w-12 shrink-0" aria-hidden />
        ) : (
          <ProgressRing percent={percent} />
        )}
      </div>

      <div className="text-center">
        <h1 className="text-3xl text-pine">{title}</h1>
        {blurb && <p className="mt-1 text-stone">{blurb}</p>}
      </div>
    </header>
  );
}

/** "Lessons · 6" above a list, with the count set apart in small capitals. */
export function ListHeading({ title, count, noun = "lessons" }: { title: string; count: number; noun?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
      <h2 className="text-xl text-pine">{title}</h2>
      <span className="text-xs font-semibold uppercase tracking-widest text-stone">
        {count} {noun}
      </span>
    </div>
  );
}
