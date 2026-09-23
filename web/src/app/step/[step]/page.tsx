"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/cards";
import { RequireUser, Shell } from "@/components/Shell";
import { Bullets, InfoTable } from "@/components/text";
import { useApp } from "@/lib/app-state";
import { displayTitle, getStep, partItems, type StepContent } from "@/lib/content";
import { continueTarget, exerciseHref, hrefOf, partProgress } from "@/lib/progress";

function Closing({ step }: { step: StepContent }) {
  const { closing } = step;
  return (
    <section className="space-y-3 rounded-2xl bg-green-soft p-5">
      <h2 className="text-xl font-semibold text-green">{closing.title}</h2>
      <p className="font-semibold">{closing.text}</p>
      <Bullets items={closing.next} />
      <p className="text-muted">{closing.tip}</p>
      {closing.last_lines.map((l) => (
        <p key={l} className="font-semibold text-indigo">
          {l}
        </p>
      ))}
    </section>
  );
}

/** The step's own introduction, collapsed after the person has started. */
function StepIntro({ step, startOpen }: { step: StepContent; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const s = step.step;
  return (
    <section className="rounded-2xl bg-white p-5 sm:p-6">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left text-xl font-semibold text-indigo"
      >
        {s.intro_title ?? "Welcome"}
        <span aria-hidden className={`text-base transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-5">
          <div className="space-y-3">
            {s.intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {s.before_you_start && (
            <div className="space-y-2">
              <h3 className="font-semibold text-indigo">{s.before_you_start.title}</h3>
              <Bullets items={s.before_you_start.bullets} />
              {s.before_you_start.note && <p className="text-muted">{s.before_you_start.note}</p>}
            </div>
          )}
          {s.where_to_start && (
            <div className="space-y-2">
              <h3 className="font-semibold text-indigo">{s.where_to_start.title}</h3>
              <InfoTable lead={s.where_to_start.intro} columns={s.where_to_start.columns} rows={s.where_to_start.rows} />
              {s.where_to_start.challenge && (
                <Card tone="challenge" title="A friendly challenge" collapsible={false}>
                  <p>{s.where_to_start.challenge}</p>
                </Card>
              )}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="font-semibold text-indigo">How this workbook works</h3>
            <Bullets items={s.how_it_works} />
          </div>
          <div>
            <h3 className="font-semibold text-indigo">Word help</h3>
            <dl className="mt-2 space-y-1">
              {s.word_help.map((w) => (
                <div key={w.term}>
                  <dt className="inline font-semibold">{w.term}: </dt>
                  <dd className="inline">{w.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-indigo">Your route through Step {s.number}</h3>
            <InfoTable
              columns={["", "What you do", "Time", "You finish with"]}
              rows={step.parts.map((p) => [
                `${p.label}${p.optional ? " (optional)" : ""}`,
                p.route_title ?? p.title,
                p.time,
                p.finish.title,
              ])}
            />
            {s.route_tip && (
              <p className="text-sm text-muted">
                <span className="font-semibold text-amber">Good to know: </span>
                {s.route_tip}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function StepOverview({ step }: { step: StepContent }) {
  const { user, statuses } = useApp();
  const n = step.step.number;
  const next = continueTarget(n, statuses, user?.id);
  const started = partItemsOf(step).some((id) => statuses[id]);
  const first = step.parts[0];

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wide text-amber">
        Step {n} · {step.step.title}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-indigo sm:text-4xl">{step.step.question}</h1>
      <div className="mt-3 text-lg text-indigo">
        {step.step.tagline.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {next && started && (
          <Link href={hrefOf(next)} className="btn btn-primary">
            Continue where I stopped
            <span className="font-normal opacity-80">· {displayTitle(next.exercise)}</span>
          </Link>
        )}
        {!started && (
          <Link href={exerciseHref(n, first.id, partItems(first)[0].id)} className="btn btn-primary">
            Start with {first.title}
          </Link>
        )}
      </div>

      <div className="mt-6">
        <StepIntro step={step} startOpen={!started} />
      </div>

      {next === null && (
        <div className="mt-6">
          <Closing step={step} />
        </div>
      )}

      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {step.parts.map((part) => {
          const { done, total, complete } = partProgress(part, statuses);
          const items = partItems(part);
          const target = items.find((e) => statuses[e.id] !== "done") ?? items[0];
          return (
            <li key={part.id}>
              <Link
                href={exerciseHref(n, part.id, target.id)}
                className="flex h-full flex-col rounded-2xl bg-white p-5 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between text-sm text-muted">
                  <span className="font-semibold text-amber">
                    {part.label}
                    {part.optional && <span className="font-normal text-muted"> (optional)</span>}
                  </span>
                  <span>{part.time}</span>
                </div>
                <h2 className="mt-1 text-xl font-semibold text-indigo">{part.title}</h2>
                <p className="mt-2 flex-1 text-muted">{part.promise}</p>
                <div className="mt-4">
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
                  <p className="mt-3 text-sm">
                    <span className="text-muted">You finish with: </span>
                    <span className="font-medium">{part.finish.title}</span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {step.step.general_tip && (
        <p className="mt-8 rounded-2xl border border-sand-deep p-4 text-muted">
          <span className="font-semibold text-amber">Good to know: </span>
          {step.step.general_tip}
        </p>
      )}

      {step.sources && (
        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-indigo">{step.sources.title}</h2>
          <InfoTable lead={step.sources.intro} columns={step.sources.columns} rows={step.sources.rows} />
          {step.sources.expert_work && (
            <Card tone="expert" title="This is expert work" collapsible={false}>
              <p>{step.sources.expert_work}</p>
            </Card>
          )}
        </section>
      )}

      <p className="mt-6 text-sm">
        <Link href="/freedom-idea" className="text-green underline">
          About the Freedom idea
        </Link>
      </p>
    </>
  );
}

const partItemsOf = (step: StepContent) => step.parts.flatMap((p) => partItems(p).map((e) => e.id));

export default function StepPage() {
  const { step } = useParams<{ step: string }>();
  const content = getStep(Number(step));
  return (
    <Shell>
      <RequireUser>
        {content ? (
          <StepOverview step={content} />
        ) : (
          <p>
            This step does not exist. <Link href="/dashboard" className="underline">Back to the overview</Link>
          </p>
        )}
      </RequireUser>
    </Shell>
  );
}
