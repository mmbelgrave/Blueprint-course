"use client";
// A piece of text that is there when you want it and out of the way when you
// don't: the explanation of an exercise or a part. The exercise comes first on
// the page; this sits under it. Someone who watched the video never opens it.
import { useState } from "react";

export function Fold({
  title,
  minutes,
  defaultOpen = false,
  children,
}: {
  title: string;
  minutes?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-line bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="display text-lg text-pine">
          {title}
          {minutes ? <span className="ml-2 font-sans text-sm text-stone">{minutes} min read</span> : null}
        </span>
        <span aria-hidden className={`text-sm text-stone transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && <div className="space-y-3 border-t border-line px-5 py-4">{children}</div>}
    </section>
  );
}

/** One video per part. Until the address is there, it says so plainly. */
export function VideoSlot({ video }: { video?: { title: string; length: string | null; url: string | null } }) {
  if (!video) return null;
  if (!video.url) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-white px-5 py-3 text-stone print:hidden">
        <span className="font-semibold text-pine">Video: {video.title}</span> — being recorded
        {video.length ? `, about ${video.length}` : ""}. The written explanation below says the same thing.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white print:hidden">
      <div className="aspect-video w-full bg-pine">
        <iframe
          src={video.url}
          title={`Video: ${video.title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
      <p className="px-5 py-2 text-sm text-stone">
        <span className="font-semibold text-pine">{video.title}</span>
        {video.length ? ` · ${video.length}` : ""} — the written explanation says the same thing.
      </p>
    </div>
  );
}
