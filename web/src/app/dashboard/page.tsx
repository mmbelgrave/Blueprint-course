"use client";
import Link from "next/link";
import { JourneyMotif } from "@/components/brand";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { journey, partItems, PRODUCT, steps } from "@/lib/content";
import { continueTarget, exerciseHref, hrefOf, stepHref, stepProgress } from "@/lib/progress";

/** The whole road: three phases, eight steps. Two of them are in the app today. */
function WholeRoad() {
  const { user, statuses } = useApp();
  const doneStep = (n: number) => {
    const s = steps.find((x) => x.step.number === n);
    return s ? stepProgress(s, statuses) : null;
  };
  /**
   * A step you have started opens where you stopped. A step you have not
   * started opens at its very first page — including the optional Start part,
   * which "continue" would otherwise skip.
   */
  const stepTarget = (n: number) => {
    const content = steps.find((x) => x.step.number === n);
    if (!content) return stepHref(n);
    const first = content.parts[0];
    const fromTheTop = exerciseHref(n, first.id, partItems(first)[0].id);
    if (!stepProgress(content, statuses).started) return fromTheTop;
    const next = continueTarget(n, statuses, user?.id);
    return next ? hrefOf(next) : fromTheTop;
  };

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl text-pine">{journey.title}</h2>
          <p className="mt-1 text-stone">{journey.intro}</p>
        </div>
        <JourneyMotif phase="Choose it" />
      </div>

      <ol className="mt-5 space-y-4">
        {journey.phases.map((phase) => (
          <li key={phase.id}>
            <p className="display text-lg text-pine">
              {phase.name}
              <span className="ml-2 font-sans text-sm text-stone">
                step{phase.steps.length > 1 ? "s" : ""} {phase.steps[0]}
                {phase.steps.length > 1 ? `–${phase.steps.at(-1)}` : ""}
              </span>
            </p>
            <p className="text-sm text-stone">{phase.says}</p>
            <ol className="mt-2 grid gap-2 sm:grid-cols-2">
              {journey.steps
                .filter((s) => phase.steps.includes(s.number))
                .map((s) => {
                  const progress = s.in_app ? doneStep(s.number) : null;
                  return (
                    <li key={s.number}>
                      {s.in_app ? (
                        <Link
                          href={stepTarget(s.number)}
                          className="flex h-full gap-3 rounded-xl border-[1.75px] border-line bg-white p-3 transition hover:border-pine"
                        >
                          <StepNumber n={s.number} active />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-pine">{s.title}</span>
                            <span className="block text-sm text-stone">{s.question}</span>
                            {progress && (
                              <span className="mt-2 flex items-center gap-2">
                                <span className="h-2 flex-1 overflow-hidden rounded-full bg-sage">
                                  <span
                                    className={`block h-full rounded-full ${progress.complete ? "bg-success" : "bg-pine"}`}
                                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                                  />
                                </span>
                                {progress.complete && <span className="text-sm font-semibold text-success">✓</span>}
                              </span>
                            )}
                          </span>
                        </Link>
                      ) : (
                        <div className="flex h-full gap-3 rounded-xl border border-dashed border-line p-3">
                          <StepNumber n={s.number} />
                          <span className="min-w-0">
                            <span className="block font-semibold text-stone">{s.title}</span>
                            <span className="block text-sm text-stone">{s.question}</span>
                            <span className="mt-1 block text-sm text-stone">being written</span>
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
            </ol>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm text-stone">{journey.two_outcomes}</p>
    </section>
  );
}

function StepNumber({ n, active = false }: { n: number; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        active ? "bg-pine text-sand" : "bg-sage text-stone"
      }`}
    >
      {n}
    </span>
  );
}

function Dashboard() {
  const { profile } = useApp();

  return (
    <>
      <h1 className="text-3xl text-pine">
        {profile?.first_name ? `Welcome, ${profile.first_name}.` : "Welcome."}
      </h1>
      <p className="mt-2 text-lg text-stone">
        {PRODUCT.name} · {PRODUCT.edition}
      </p>

      <p className="mt-4">
        <Link href="/how-it-works" className="btn btn-ghost text-sm">
          Read this first: how this app works
        </Link>
      </p>

      <div className="mt-6">
        <WholeRoad />
      </div>

      <p className="mt-8 text-sm text-stone">{journey.not_here_yet}</p>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Shell>
      <RequireUser>
        <Dashboard />
      </RequireUser>
    </Shell>
  );
}
