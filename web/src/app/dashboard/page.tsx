"use client";
import Link from "next/link";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { displayTitle, partItems, PRODUCT, steps } from "@/lib/content";
import { continueTarget, exerciseHref, hrefOf, stepHref, stepProgress } from "@/lib/progress";

function Dashboard() {
  const { user, profile, statuses } = useApp();

  return (
    <>
      <h1 className="text-3xl font-bold text-indigo">
        {profile?.first_name ? `Welcome, ${profile.first_name}.` : "Welcome."}
      </h1>
      <p className="mt-2 text-lg text-muted">
        {PRODUCT.name} · {PRODUCT.edition}
      </p>

      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
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
              <p className="text-sm font-semibold text-amber">Step {n}</p>
              <h2 className="text-2xl font-semibold text-indigo">{step.step.title}</h2>
              <p className="mt-1 flex-1 text-lg">{step.step.question}</p>
              <div className="mt-6">
                <div className="flex justify-between text-sm">
                  <span>
                    {done} of {total} done
                  </span>
                  {complete && <span className="font-semibold text-green">Well done</span>}
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
                  <div
                    className={`h-full rounded-full ${complete ? "bg-green" : "bg-indigo"}`}
                    style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <p className="mt-4 min-h-[3rem] text-sm text-muted">{nextLabel}</p>
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

      <p className="mt-8 rounded-2xl border border-sand-deep p-4 text-muted">
        <span className="font-semibold text-amber">Good to know: </span>
        {steps[0].step.general_tip}
      </p>
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
