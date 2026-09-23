"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/cards";
import { FieldInput, formatMoney, tableFieldTotal } from "@/components/fields";
import { PartnerPanel } from "@/components/PartnerPanel";
import { RequireUser, Shell } from "@/components/Shell";
import { Bullets, InfoTable, Paragraphs } from "@/components/text";
import { useApp } from "@/lib/app-state";
import {
  displayNumber,
  displayTitle,
  exerciseFields,
  findExercise,
  partItems,
  setupKey,
  stepExercises,
  type Block,
  type Exercise,
  type Field,
  type Located,
  type Part,
} from "@/lib/content";
import { DraftHelper, PartFeedback, type Drafts } from "@/components/results";
import { draftFields } from "@/lib/drafts";
import { fieldExtras } from "@/lib/field-extras";
import { hrefOf, partProgress, rememberLastExercise, stepHref } from "@/lib/progress";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD", "ZAR", "BRL"];

function Fields({
  storeId,
  exercise,
  block,
  drafts = {},
}: {
  storeId: string;
  exercise: Exercise;
  block: Block;
  drafts?: Drafts;
}) {
  const { answers, profile, setAnswer } = useApp();
  const values = answers[storeId] ?? {};
  const baseExtras = fieldExtras(exercise, answers);
  // An AI partner draft is offered next to its box; the person decides.
  const extrasFor = (field: Field) =>
    drafts[field.id]
      ? {
          ...baseExtras(field),
          suggestion: {
            title: "Draft — make it yours:",
            text: drafts[field.id],
            button: "Use this draft",
            replaceButton: "Replace my text with this draft",
          },
        }
      : baseExtras(field);

  return (
    <div className="space-y-6">
      {block.fields.map((field) => {
        if (field.show_if && !Object.entries(field.show_if).every(([k, v]) => values[k] === v)) {
          return null;
        }
        return (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            currency={profile?.currency ?? "EUR"}
            extras={extrasFor(field)}
            onChange={(v) => setAnswer(storeId, field.id, v)}
          />
        );
      })}
    </div>
  );
}

/** Part setup (Step 1 Part 3: currency and household size), shown with the part intro. */
function SetupFields({ part }: { part: Part }) {
  const { profile, saveProfile } = useApp();
  const [error, setError] = useState(false);
  if (!part.setup) return null;
  const fields = part.setup.fields.filter((f) => f.id !== "currency");
  const currencyField = part.setup.fields.find((f) => f.id === "currency");
  const setupExercise: Exercise = { id: setupKey(part), title: "", start_here: { fields } };

  return (
    <div className="mt-4 space-y-4 rounded-xl bg-sand p-4">
      {currencyField && profile && (
        <label className="block">
          <span className="mb-1 block font-medium">{currencyField.label}</span>
          <select
            className="field-input max-w-[10rem]"
            value={profile.currency}
            onChange={async (e) => {
              try {
                await saveProfile({ ...profile, currency: e.target.value });
                setError(false);
              } catch {
                setError(true);
              }
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {error && <span className="mt-1 block text-sm text-amber">Not saved. Please try again.</span>}
        </label>
      )}
      <Fields storeId={setupKey(part)} exercise={setupExercise} block={{ fields }} />
    </div>
  );
}

function SaveIndicator() {
  const { saveState } = useApp();
  const text = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    error: "Not saved yet. We keep trying. Please check your internet.",
  }[saveState];
  return (
    <span aria-live="polite" className={`text-sm ${saveState === "error" ? "text-amber" : "text-muted"}`}>
      {text}
    </span>
  );
}

/** Step 1 3.5 Go deeper: new-life costs from 3.2 plus 30%. */
function DeeperHint({ exercise }: { exercise: Exercise }) {
  const { answers, profile } = useApp();
  if (exercise.id !== "3.5" || !exercise.go_deeper?.auto_hint) return null;
  const source = findExercise("3.2");
  const field = source && exerciseFields(source.exercise).find((f) => f.id === "costs");
  if (!field) return null;
  const t = tableFieldTotal(field, answers["3.2"]?.costs, "new_life");
  if (!t.filled) return null;
  const currency = profile?.currency ?? "EUR";
  return (
    <p className="rounded-lg bg-sand p-3 text-sm">
      Your costs in your new life plus 30%: <strong>{formatMoney(t.value * 1.3, currency)}</strong> per month
      (instead of {formatMoney(t.value, currency)}){t.complete ? "" : " — not complete yet"}.
    </p>
  );
}

/** Step 2 3.1: the Step 1 new-life total next to the money check (for the 20% check). */
function Step1MoneyHint({ exercise }: { exercise: Exercise }) {
  const { answers, profile } = useApp();
  if (exercise.id !== "s2-3.1") return null;
  const source = findExercise("3.2");
  const field = source && exerciseFields(source.exercise).find((f) => f.id === "costs");
  if (!field) return null;
  const t = tableFieldTotal(field, answers["3.2"]?.costs, "new_life");
  if (!t.filled) return null;
  return (
    <p className="rounded-lg bg-sand p-3 text-sm">
      Your total in Step 1 (3.2, in my new life):{" "}
      <strong>{formatMoney(t.value, profile?.currency ?? "EUR")}</strong> per month
      {t.complete ? "" : " — not complete yet"}.
    </p>
  );
}

function ExerciseView({ stepNumber, exerciseId }: { stepNumber: number; exerciseId: string }) {
  const found = findExercise(exerciseId);
  if (!found || found.step.step.number !== stepNumber) {
    return (
      <p>
        This page does not exist. <Link href="/dashboard" className="underline">Back to the overview</Link>
      </p>
    );
  }
  return <ExerciseBody located={found} />;
}

function ExerciseBody({ located }: { located: Located }) {
  const { step, part, exercise } = located;
  const stepNumber = step.step.number;
  const { user, statuses, setStatus } = useApp();
  const [statusError, setStatusError] = useState(false);
  const [drafts, setDrafts] = useState<Drafts>({});
  const canDraft = draftFields(exercise).length > 0;
  // Feedback once per part: on its summary page, or on its last required page.
  const feedbackHere = part.summary
    ? exercise.kind === "summary"
    : exercise.id === part.exercises.filter((e) => !e.optional).at(-1)?.id;
  const changeStatus = async (status: "done" | "in_progress") => {
    setStatusError(!(await setStatus(exercise.id, status)));
  };

  useEffect(() => {
    if (user) rememberLastExercise(user.id, stepNumber, exercise.id);
  }, [user, stepNumber, exercise.id]);

  const pages = stepExercises(stepNumber);
  const index = pages.findIndex((e) => e.exercise.id === exercise.id);
  const prev = pages[index - 1];
  const next = pages[index + 1];
  const items = partItems(part);
  const isFirstOfPart = items[0].id === exercise.id;
  const isSummary = exercise.kind === "summary";
  const showTalk = part.talk && exercise.id === part.exercises.at(-1)!.id;
  const done = statuses[exercise.id] === "done";
  const progress = partProgress(part, statuses);
  const tablesAt = (place: "before" | "after") =>
    exercise.tables?.filter((t) => t.place === place).map((t) => <InfoTable key={t.rows[0][0]} {...t} />);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <article className="min-w-0 space-y-6">
        <header>
          <Link href={stepHref(stepNumber)} className="text-sm text-muted hover:underline">
            Step {stepNumber} · {step.step.title} · {part.label} · {part.title} · {progress.done} of {progress.total} done
          </Link>
          {isFirstOfPart && (
            <div className="mt-4 space-y-2 rounded-2xl bg-white p-5">
              <p className="text-lg font-semibold text-indigo">{part.promise}</p>
              {part.can_skip && (
                <div className="py-1">
                  <Card tone="skip" title="Can you skip this part?" collapsible={false}>
                    <p>{part.can_skip}</p>
                  </Card>
                </div>
              )}
              <Paragraphs text={part.intro} />
              <Bullets items={part.intro_bullets} />
              {part.intro_after && <p>{part.intro_after}</p>}
              {part.tips?.map((t) => (
                <p key={t} className="rounded-lg border border-sand-deep p-3 text-sm">
                  <span className="font-semibold text-amber">Good to know: </span>
                  {t}
                </p>
              ))}
              <SetupFields part={part} />
            </div>
          )}
          {isSummary && (
            <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-amber">What does this tell me?</p>
          )}
          <h1 className={`${isSummary ? "mt-1" : "mt-5"} text-3xl font-bold text-indigo`}>
            <span className="mr-2 text-amber">{displayNumber(exercise)}</span>
            {exercise.title}
            {exercise.optional && <span className="ml-2 align-middle text-base font-normal text-muted">(optional)</span>}
          </h1>
          <div className="mt-3 space-y-2 text-lg">
            <Paragraphs text={exercise.intro} />
          </div>
          <Bullets items={exercise.intro_bullets} className="mt-2 text-lg" />
        </header>

        {tablesAt("before")}

        {exercise.belief_examples && (
          <div className="grid gap-4 rounded-2xl border border-sand-deep p-4 sm:grid-cols-2">
            {exercise.belief_examples.map((g) => (
              <div key={g.title}>
                <p className="font-semibold">{g.title}</p>
                <ul className="mt-1 space-y-1 italic text-muted">
                  {g.items.map((b) => (
                    <li key={b}>&ldquo;{b}&rdquo;</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {exercise.start_here.fields.length > 0 && (
          <section className="space-y-4 rounded-2xl bg-white p-5 sm:p-6">
            {!isSummary && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-amber">Start here</h2>
            )}
            <div className="space-y-2 text-lg">
              <Paragraphs text={exercise.start_here.prompt} />
            </div>
            <Bullets items={exercise.start_here.bullets} className="text-muted" />
            <Step1MoneyHint exercise={exercise} />
            {canDraft && <DraftHelper pageId={exercise.id} onDrafts={setDrafts} />}
            <Fields storeId={exercise.id} exercise={exercise} block={exercise.start_here} drafts={drafts} />
          </section>
        )}

        {tablesAt("after")}

        {exercise.choice_explanations && (
          <Card tone="example" title={exercise.choice_explanations_intro ?? ""} collapsible={false}>
            <Bullets items={exercise.choice_explanations} />
          </Card>
        )}

        {exercise.go_deeper && (
          <Card tone="tips" title="Go deeper (optional)">
            <Paragraphs text={exercise.go_deeper.prompt} />
            <DeeperHint exercise={exercise} />
            <div className="pt-2">
              <Fields storeId={exercise.id} exercise={exercise} block={exercise.go_deeper} />
            </div>
          </Card>
        )}

        {exercise.where_to_check?.map((w) => (
          <Card key={w} tone="sources" title="Where to check it yourself" collapsible={false}>
            <p>{w}</p>
          </Card>
        ))}
        {exercise.example && (
          <Card tone="example" title={`Made-up example — ${exercise.example.who}`}>
            <p>{exercise.example.text}</p>
          </Card>
        )}
        {exercise.tips && (
          <Card tone="tips" title="Good to know">
            {exercise.tips.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </Card>
        )}
        {exercise.challenge && (
          <Card tone="challenge" title="A friendly challenge">
            <p>{exercise.challenge}</p>
          </Card>
        )}
        {exercise.expert_work && (
          <Card tone="expert" title="This is expert work" collapsible={false}>
            <p>{exercise.expert_work}</p>
          </Card>
        )}
        {exercise.freedom_idea && (
          <Card tone="freedom" title="Freedom idea">
            <p>{exercise.freedom_idea}</p>
            <Link href="/freedom-idea" className="inline-block text-sm font-semibold text-green underline">
              About the Freedom idea
            </Link>
          </Card>
        )}
        {exercise.story && (
          <Card tone="story" title="My story — Mwata">
            <p>{exercise.story.text}</p>
          </Card>
        )}
        {exercise.go_further && (
          <p className="rounded-2xl border border-sand-deep p-4 text-muted">{exercise.go_further}</p>
        )}

        {(isSummary || (!part.summary && exercise.id === part.exercises.at(-1)!.id)) && (
          <p className="rounded-2xl bg-green-soft p-4">
            <span className="font-semibold text-green">Result: {part.finish.title}</span>
            {part.finish.description && <> — {part.finish.description}</>}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-sand-deep pt-6">
          {done ? (
            <>
              <span className="inline-flex items-center gap-2 font-semibold text-green">
                <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-green" />
                Done
              </span>
              <button className="text-sm text-muted underline" onClick={() => changeStatus("in_progress")}>
                Mark as not done
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => changeStatus("done")}>
              Mark as done
            </button>
          )}
          <SaveIndicator />
          {statusError && (
            <p role="alert" className="w-full text-sm text-amber">
              This was not saved. Please check your internet and try again.
            </p>
          )}
        </div>

        {(exercise.id === "5.1" || exercise.id === "s2-5.1") && (
          <Link href={`/step/${stepNumber}/print`} className="btn btn-primary">
            See and save {part.finish.title} as PDF
          </Link>
        )}

        {feedbackHere && <PartFeedback partId={part.id} />}

        {showTalk && (
          <Card tone="talk" title="Talk about it" collapsible={false}>
            <p>{part.talk}</p>
          </Card>
        )}

        <nav className="flex justify-between gap-4 pt-2">
          {prev ? (
            <Link href={hrefOf(prev)} className="btn btn-ghost">
              ← {displayNumber(prev.exercise)}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={hrefOf(next)} className="btn btn-ghost text-right">
              {displayTitle(next.exercise)} →
            </Link>
          ) : (
            <Link href={stepHref(stepNumber)} className="btn btn-ghost">
              Step {stepNumber} overview →
            </Link>
          )}
        </nav>
      </article>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <PartnerPanel exerciseId={exercise.id} />
      </aside>
    </div>
  );
}

export default function ExercisePage() {
  const { step, exerciseId } = useParams<{ step: string; partId: string; exerciseId: string }>();
  return (
    <Shell wide>
      <RequireUser>
        <ExerciseView key={exerciseId} stepNumber={Number(step)} exerciseId={decodeURIComponent(exerciseId)} />
      </RequireUser>
    </Shell>
  );
}
