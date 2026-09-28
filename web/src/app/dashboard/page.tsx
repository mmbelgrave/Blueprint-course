"use client";
import Link from "next/link";
import { JourneyMotif } from "@/components/brand";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { displayTitle, journey, partItems, PRODUCT, steps } from "@/lib/content";
import { continueTarget, exerciseHref, hrefOf, stepHref, stepProgress } from "@/lib/progress";

/** The whole road: three phases, eight steps. Two of them are in the app today. */
function WholeRoad() {
  const { statuses } = useApp();
  const doneStep = (n: number) => {
    const s = steps.find((x) => x.step.number === n);
    return s ? stepProgress(s, statuses) : null;
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
                          href={stepHref(s.number)}
                          className="flex h-full gap-3 rounded-xl border-[1.75px] border-line bg-white p-3 transition hover:border-pine"
                        >
                          <StepNumber n={s.number} active />
                          <span className="min-w-0">
                            <span className="block font-semibold text-pine">{s.title}</span>
                            <span className="block text-sm text-stone">{s.question}</span>
                            {progress && (
                              <span className="mt-1 block text-sm">
                                {progress.complete ? (
                                  <span className="font-semibold text-success">✓ done</span>
                                ) : (
                                  `${progress.done} of ${progress.total} pages done`
                                )}
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
  const { user, profile, statuses } = useApp();

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

      <h2 className="mt-10 text-xl text-pine">Where you are now</h2>
      <ol className="mt-3 grid gap-4 sm:grid-cols-2">
        {steps.map((step) => {
          const n = step.step.number;
          const { done, total, complete, started } = stepProgress(step, statuses);
          const next = continueTarget(n, statuses, user?.id);
          const first = step.parts[0];
          // Both cards have the same shape, so progress, "next" line and buttons line up.
          const nextHref = started && next ? hrefOf(next) : exerciseHref(n, first.id, partItems(first)[0].id);
          const nextLabel = complete
            ? "All done — well done."
            : started && next
              ? `Next: ${displayTitle(next.exercise)}`
              : `First: ${first.title}`;
          return (
            <li key={step.step.id} className="flex flex-col rounded-2xl bg-white p-5">
              <p className="text-sm font-semibold text-ochre">Step {n}</p>
              <h3 className="text-2xl text-pine">{step.step.title}</h3>
              <p className="mt-1 flex-1 text-lg">{step.step.question}</p>
              <div className="mt-6">
                <div className="flex justify-between text-sm">
                  <span>
                    {done} of {total} done
                  </span>
                  {complete && <span className="font-semibold text-success">✓ Well done</span>}
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sage">
                  <div
                    className={`h-full rounded-full ${complete ? "bg-success" : "bg-pine"}`}
                    style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="mt-4 min-h-[3rem] text-sm text-stone">{nextLabel}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!complete && (
                  <Link href={nextHref} className="btn btn-primary text-sm">
                    {started ? "Continue" : "Start"}
                  </Link>
                )}
                <Link href={stepHref(n)} className="btn btn-ghost text-sm">
                  Step overview
                </Link>
              </div>
            </li>
          );
        })}
      </ol>

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
