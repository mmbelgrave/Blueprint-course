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
