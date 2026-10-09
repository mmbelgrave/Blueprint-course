"use client";
/*
 * "Your result is ready" (spec §6.5).
 *
 * A step ends in a document — My Working Direction, My Explore Summary, My
 * Decision — and a phase ends in the Blueprint. Until this card existed the
 * only way to reach one was a link on the last page of the last part, which
 * is a strange place to keep the thing somebody did the whole step for.
 *
 * It shows nothing to press until there is something to read. A document made
 * of answers nobody has written yet is an empty page with a proud heading on
 * it, and handing that to someone is worse than saying "not yet".
 */
import Link from "next/link";

export function ResultCard({
  title,
  blurb,
  href,
  ready,
  waiting,
}: {
  title: string;
  blurb: string;
  /** The page that shows it. "Download" is the same page, asked to hand over a file. */
  href: string;
  ready: boolean;
  /** What still has to be written, in words, when it is not ready. */
  waiting: string;
}) {
  return (
    <section className="rounded-2xl bg-sage p-5 text-center">
      <h2 className="text-lg text-pine">{title}</h2>
      <p className="mt-1 text-stone">{blurb}</p>
      {ready ? (
        <p className="mt-3 flex flex-wrap justify-center gap-2">
          <Link className="btn btn-primary" href={href}>
            Open
          </Link>
          <Link className="btn btn-ghost" href={`${href}?download=1`}>
            Download
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-sm text-stone">{waiting}</p>
      )}
    </section>
  );
}
