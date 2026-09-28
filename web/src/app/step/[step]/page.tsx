"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { JourneyMotif } from "@/components/brand";
import { Card } from "@/components/cards";
import { PartRail } from "@/components/journey";
import { RequireUser, Shell } from "@/components/Shell";
import { Bullets, InfoTable } from "@/components/text";
import { useApp } from "@/lib/app-state";
import { displayTitle, getStep, partItems, type StepContent } from "@/lib/content";
import { continueTarget, exerciseHref, hrefOf, partProgress } from "@/lib/progress";

function Closing({ step }: { step: StepContent }) {
  const { closing } = step;
  return (
    <section className="space-y-3 rounded-2xl bg-sage p-5">
      <h2 className="text-xl text-pine">{closing.title}</h2>
      <p className="font-semibold">{closing.intro}</p>
      <Bullets items={closing.bullets} />
      {closing.tips?.map((t) => (
        <p key={t} className="text-stone">
          {t}
        </p>
      ))}
      {closing.final.map((l) => (
        <p key={l} className="display text-lg text-pine">
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
        className="display flex w-full items-center justify-between text-left text-xl text-pine"
      >
        Welcome to Step {s.number}
        <span aria-hidden className={`text-base transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-6">
          <div className="space-y-3">
            {s.intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          {s.ways_to_use && (
            <div className="space-y-2">
              <h3 className="display text-lg text-pine">{s.ways_to_use.title}</h3>
              <InfoTable rows={s.ways_to_use.rows} />
            </div>
          )}

          {s.what_you_need && (
            <div className="space-y-2">
              <h3 className="display text-lg text-pine">{s.what_you_need.title}</h3>
              <Bullets items={s.what_you_need.bullets} />
              {s.what_you_need.after && <p className="text-stone">{s.what_you_need.after}</p>}
            </div>
          )}

          {s.where_to_start && (
            <div className="space-y-2">
              <h3 className="display text-lg text-pine">{s.where_to_start.title}</h3>
              <InfoTable lead={s.where_to_start.intro} columns={s.where_to_start.header} rows={s.where_to_start.rows} />
              {s.where_to_start.challenge && (
                <Card tone="challenge" title="A friendly challenge" collapsible={false}>
                  <p>{s.where_to_start.challenge}</p>
                </Card>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="display text-lg text-pine">{s.how_it_works.title}</h3>
            <Bullets items={s.how_it_works.bullets} />
          </div>

          <div>
            <h3 className="display text-lg text-pine">{s.word_help.title}</h3>
            <dl className="mt-2 space-y-1">
              {s.word_help.items.map(([term, meaning]) => (
                <div key={term}>
                  <dt className="inline font-semibold">{term}: </dt>
                  <dd className="inline">{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-2">
            <h3 className="display text-lg text-pine">{s.route.title}</h3>
            <InfoTable columns={s.route.header} rows={s.route.rows} />
          </div>

          {s.tips?.map((t) => (
            <Card key={t} tone="tips" title="Good to know" collapsible={false}>
              <p>{t}</p>
            </Card>
          ))}
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
      <p className="text-sm font-semibold tracking-wide text-ochre">
        Step {n} · {step.step.title}
      </p>
      <h1 className="mt-1 text-3xl text-pine sm:text-4xl">{step.step.question}</h1>
      <div className="mt-3 text-lg text-pine">
        {step.step.tagline.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>

      <div className="mt-5">
        <JourneyMotif phase="Choose it" note="Steps 1 and 2 are the choosing: what you want, and where it could work." />
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

      {started && (
        <div className="mt-6 rounded-2xl bg-white p-5">
          <PartRail content={step} statuses={statuses} />
        </div>
      )}

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
                <div className="flex items-center justify-between text-sm text-stone">
                  <span className="font-semibold text-ochre">
                    {part.label}
                    {part.optional && <span className="font-normal text-stone"> (optional)</span>}
                  </span>
                  <span>{part.time}</span>
                </div>
                <h2 className="mt-1 text-xl text-pine">{part.title}</h2>
                <p className="mt-2 flex-1 text-stone">{part.promise}</p>
                <div className="mt-4">
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
                  <p className="mt-3 text-sm">
                    <span className="text-stone">You finish with: </span>
                    <span className="font-medium">{part.finish.title}</span>
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      {step.sources && (
        <section className="mt-8 space-y-3">
          <h2 className="text-xl text-pine">{step.sources.title}</h2>
          <InfoTable lead={step.sources.intro} columns={step.sources.header} rows={step.sources.rows} />
          {step.sources.closing && <p className="text-stone">{step.sources.closing}</p>}
          {step.sources.expert_work && (
            <Card tone="expert" title="This is expert work" collapsible={false}>
              <p>{step.sources.expert_work}</p>
            </Card>
          )}
        </section>
      )}
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
