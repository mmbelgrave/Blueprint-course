"use client";
// Modules, level one (spec §6.9): free material, the Introduction, and the
// three phases — with what has been watched, and an offer where there is
// something to buy.
import Link from "next/link";
import { Mark } from "@/components/brand";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { PRODUCT } from "@/lib/content";
import { buyUrl, lessonKey, modules, phaseProgress, stateOf } from "@/lib/modules-app";

export default function Modules() {
  const { entitlements, profile, statuses } = useApp();

  return (
    <Shell quiet ownHeader>
      <RequireUser>
        <section className="space-y-6">
          <header className="text-center">
            <span className="flex justify-center">
              <Mark size={58} />
            </span>
            <h1 className="mt-3 text-3xl text-pine">
              {profile?.first_name ? `Welcome, ${profile.first_name}.` : "Welcome."}
            </h1>
            <p className="mt-1 text-lg text-stone">{PRODUCT.name}</p>
          </header>

          <ul className="space-y-4">
            {modules.map((m) => {
              const state = stateOf(m, entitlements);
              const watched = m.kind === "lesson" && statuses[lessonKey(m.id)] === "done";
              // A phase counts its lessons; the Introduction is one lesson, so
              // it gets the same bar rather than a tick on its own.
              const progress =
                m.kind === "phase"
                  ? phaseProgress(m, statuses)
                  : m.kind === "lesson"
                    ? { done: watched ? 1 : 0, total: 1, percent: watched ? 100 : 0, complete: watched }
                    : null;

              const inside = (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <h2 className={`text-xl ${state === "open" ? "text-pine" : "text-stone"}`}>{m.name}</h2>
                      {m.edition && <span className="block text-sm text-stone">{m.edition}</span>}
                    </span>
                    {state === "coming" && <span className="text-sm text-stone">coming soon</span>}
                    {watched && <span className="text-sm text-success">✓ watched</span>}
                  </div>
                  {m.blurb && <p className="mt-1 text-stone">{m.blurb}</p>}

                  {/* A bar wherever there is something to watch; free material is not a journey. */}
                  {state === "open" && progress && progress.total > 0 && (
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

              const card = `rounded-2xl p-5 ${state === "coming" ? "border border-dashed border-line" : "bg-white"}`;
              return (
                <li key={m.id}>
                  {state === "open" ? (
                    <Link href={`/modules/${m.id}`} className={`block ${card}`}>
                      {inside}
                    </Link>
                  ) : state === "buy" ? (
                    /* Not bought yet: you may still look inside, because the
                       free lesson lives in there and nobody buys what they
                       cannot see. The offer sits beside it, not inside the
                       link — one box, two different things to press. */
                    <div className={card}>
                      <Link href={`/modules/${m.id}`} className="block">
                        {inside}
                      </Link>
                      <p className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <Link className="btn btn-ghost" href={`/modules/${m.id}`}>
                          See what is inside
                        </Link>
                        <a className="btn btn-primary" href={buyUrl} target="_blank" rel="noopener noreferrer">
                          Get this phase
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className={card}>{inside}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </RequireUser>
    </Shell>
  );
}
