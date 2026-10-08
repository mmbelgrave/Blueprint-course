"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/cards";
import { ClosedStep } from "@/components/closed-step";
import { isFree, pageFor } from "@/lib/access-app";
import { FieldInput, formatMoney, tableFieldTotal } from "@/components/fields";
import { PartnerPanel } from "@/components/PartnerPanel";
import { RequireUser, Shell } from "@/components/Shell";
import { Bullets, InfoTable, Paragraphs } from "@/components/text";
import { useApp } from "@/lib/app-state";
import {
  asList,
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
import { Fold } from "@/components/fold";
import { VideoSlot } from "@/components/video-slot";
import { PageChips, PartRail } from "@/components/journey";
import { draftFields } from "@/lib/drafts";
import { fieldExtras } from "@/lib/field-extras";
import { helpHref } from "@/lib/support";
import { exerciseHref, partProgress, rememberLastExercise, stepHref } from "@/lib/progress";

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
  const { answers, entitlements, profile, setAnswer } = useApp();
  const free = isFree(entitlements);
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
        // A free account is not offered a picture board: nothing of theirs is
        // stored in the picture store, so nothing is promised about it.
        if (field.type === "image_board" && free) return null;
        return (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            currency={profile?.currency ?? "EUR"}
            extras={extrasFor(field)}
            pageId={storeId}
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
          {error && <span className="mt-1 block text-sm text-ochre">Not saved. Please try again.</span>}
        </label>
      )}
      <Fields storeId={setupKey(part)} exercise={setupExercise} block={{ fields }} />
    </div>
  );
}

/**
 * The example sits next to the box it belongs to, closed. It is never written
 * into the answer: the blank box is doing real work, and an example that became
 * an answer would end up in the person's notes, drafts and print-out as if it
 * were their own life.
 */
function ExampleFold({ example }: { example: { who: string; text: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-pine underline"
      >
        See an example {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl bg-sage p-4">
          <p className="display text-pine">Made-up example — {example.who}</p>
          <p className="mt-1">{example.text}</p>
          <p className="mt-2 text-sm text-stone">Your answer can be completely different.</p>
        </div>
      )}
    </div>
  );
}

/** A step back or on, next to "Mark as done". The title is in the tooltip. */
function PageArrow({
  direction,
  target,
  step,
}: {
  direction: "back" | "on";
  target?: Located;
  step: number;
}) {
  const label = target
    ? `${direction === "back" ? "Back to" : "On to"} ${displayTitle(target.exercise)}`
    : direction === "back"
      ? "Back to the step overview"
      : "Finish this step";
  const href = target ? exerciseHref(step, target.part.id, target.exercise.id) : stepHref(step);
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="btn btn-ghost h-11 w-11 shrink-0 px-0 text-lg"
    >
      <span aria-hidden>{direction === "back" ? "←" : "→"}</span>
    </Link>
  );
}

/** Rough reading time, so a fold can say what it costs to open it. */
function readingMinutes(source: { intro?: unknown; intro_bullets?: unknown; intro_after?: unknown }) {
  const text = JSON.stringify([source.intro, source.intro_bullets, source.intro_after]);
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
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
    <span aria-live="polite" className={`text-sm ${saveState === "error" ? "text-ochre" : "text-stone"}`}>
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
  const { entitlements } = useApp();
  const verdict = pageFor(exerciseId, stepNumber, entitlements);
  if (!verdict.open) return <ClosedStep step={stepNumber} why={verdict.why} />;
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
  const { user, entitlements, statuses, setStatus } = useApp();
  const free = isFree(entitlements);
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
  const prevHere = prev && prev.step.step.number === stepNumber ? prev : undefined;
  const nextHere = next && next.step.step.number === stepNumber ? next : undefined;
  const items = partItems(part);
  const isFirstOfPart = items[0].id === exercise.id;
  const isSummary = exercise.kind === "summary";
  const showTalk = part.talk && exercise.id === part.exercises.at(-1)!.id;
  const done = statuses[exercise.id] === "done";
  const progress = partProgress(part, statuses);
  const hasWhy = Boolean(exercise.intro || exercise.intro_bullets?.length);
  const whyMinutes = readingMinutes(exercise);
  const tablesAt = (place: "before" | "after") =>
    exercise.tables?.filter((t) => t.place === place).map((t) => <InfoTable key={t.rows[0][0]} {...t} />);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <article className="min-w-0 space-y-6">
        <header>
          {free ? (
            <p className="text-sm">
              <Link href="/modules" className="text-pine hover:underline">
                ← Back to the modules
              </Link>
            </p>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-4 sm:p-5">
                <PartRail content={step} statuses={statuses} currentPartId={part.id} />
              </div>
              <p className="mt-3 text-sm text-stone">
                <Link href={stepHref(stepNumber)} className="hover:underline">
                  Step {stepNumber} · {step.step.title}
                </Link>
                {" · "}
                {part.label} · {part.title} · {progress.done} of {progress.total} done
              </p>
            </>
          )}
          {isFirstOfPart && (
            <div className="mt-4 space-y-3">
              <p className="display text-lg text-pine">{part.promise}</p>
              {part.can_skip && (
                <Card tone="skip" title="Can you skip this part?" collapsible={false}>
                  <p>{part.can_skip}</p>
                </Card>
              )}
              {part.staying && (
                <Card tone="skip" title="Thinking of staying?">
                  <p>{part.staying}</p>
                </Card>
              )}
              <VideoSlot video={part.video} />
              <Fold
                title={part.intro_title ?? `About ${part.label}`}
                minutes={readingMinutes(part)}
              >
                <Paragraphs text={part.intro} />
                <Bullets items={part.intro_bullets} />
                {part.intro_after && <p>{part.intro_after}</p>}
                {part.tips?.map((t) => (
                  <p key={t} className="rounded-lg border border-line p-3 text-sm">
                    <span className="font-semibold text-ochre">Good to know: </span>
                    {t}
                  </p>
                ))}
              </Fold>
              {part.setup && (
                <div className="rounded-2xl bg-white p-5">
                  {part.setup.intro && <p className="mb-2">{part.setup.intro}</p>}
                  <SetupFields part={part} />
                </div>
              )}
            </div>
          )}
          {(isSummary || exercise.kicker) && (
            <p className="mt-5 text-sm font-semibold tracking-wide text-ochre">
              {isSummary ? "What does this tell me?" : exercise.kicker}
            </p>
          )}
          <h1 className={`${isSummary || exercise.kicker ? "mt-1" : "mt-5"} text-3xl text-pine`}>
            <span className="mr-2 text-ochre">{displayNumber(exercise)}</span>
            {exercise.title}
            {exercise.optional && <span className="ml-2 align-middle text-base font-normal text-stone">(optional)</span>}
          </h1>
          {exercise.promise && <p className="mt-2 display text-lg text-pine">{exercise.promise}</p>}
        </header>

        {/* Reference people use while answering stays in view; the "why" folds. */}
        {tablesAt("before")}

        {exercise.belief_examples && (
          <div className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
            {exercise.belief_examples.map((g) => (
              <div key={g.title}>
                <p className="font-semibold">{g.title}</p>
                <ul className="mt-1 space-y-1 italic text-stone">
                  {g.items.map((b) => (
                    <li key={b}>&ldquo;{b}&rdquo;</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {exercise.start_here && exercise.start_here.fields.length > 0 && (
          <section className="space-y-4 rounded-2xl bg-white p-5 sm:p-6">
            {!isSummary && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ochre">Start here</h2>
            )}
            <div className="space-y-2 text-lg">
              <Paragraphs text={exercise.start_here.prompt} />
            </div>
            <Bullets items={exercise.start_here.bullets} className="text-stone" />
            <Step1MoneyHint exercise={exercise} />
            {asList(exercise.example).map((ex) => (
              <ExampleFold key={ex.who + ex.text.slice(0, 20)} example={ex} />
            ))}
            {canDraft && <DraftHelper pageId={exercise.id} onDrafts={setDrafts} />}
            <Fields storeId={exercise.id} exercise={exercise} block={exercise.start_here} drafts={drafts} />
            {exercise.start_here.closing && <p className="text-stone">{exercise.start_here.closing}</p>}
          </section>
        )}

        {/*
         * The explanation of why we do this exercise — the same thing the video
         * says — sits under the questions, folded. It opens by itself only for
         * someone who has not started this part yet.
         */}
        {hasWhy && (
          <Fold title="Why this exercise" minutes={whyMinutes}>
            <div className="space-y-3 text-lg">
              <Paragraphs text={exercise.intro} />
            </div>
            <Bullets items={exercise.intro_bullets} className="text-lg" />
          </Fold>
        )}

        {tablesAt("after")}

        {exercise.choice_explanations && (
          <Card tone="example" title={exercise.choice_explanations_intro ?? ""} collapsible={false}>
            <Bullets items={exercise.choice_explanations} />
          </Card>
        )}

        {exercise.go_deeper && (
          <Card
            tone="tips"
            title={`Go deeper (optional)${exercise.go_deeper.title ? ` · ${exercise.go_deeper.title}` : ""}`}
          >
            <Paragraphs text={exercise.go_deeper.prompt} />
            <DeeperHint exercise={exercise} />
            <div className="pt-2">
              <Fields storeId={exercise.id} exercise={exercise} block={exercise.go_deeper} />
            </div>
            {exercise.go_deeper.story && (
              <div className="mt-4 rounded-xl bg-sage p-4">
                <p className="display text-pine">My story — Mwata</p>
                <p className="mt-1">{exercise.go_deeper.story.text}</p>
              </div>
            )}
          </Card>
        )}

        {exercise.result_guide && (
          <Card tone="sources" title={exercise.result_guide.title} collapsible={false}>
            <Paragraphs text={exercise.result_guide.intro} />
            <Bullets items={exercise.result_guide.bullets} className="mt-2" />
            {exercise.result_guide.closing && <p className="mt-2">{exercise.result_guide.closing}</p>}
          </Card>
        )}

        {exercise.example_page && (
          <Card tone="example" title={exercise.example_page.title}>
            {exercise.example_page.intro && <p className="mb-2">{exercise.example_page.intro}</p>}
            <InfoTable rows={exercise.example_page.rows} />
          </Card>
        )}

        {exercise.where_to_check?.map((w) => (
          <Card key={w} tone="sources" title="Where to check it yourself" collapsible={false}>
            <p>{w}</p>
          </Card>
        ))}
        {exercise.watch_out?.map((w) => (
          <Card key={w} tone="watch" title="Watch out" collapsible={false}>
            <p>{w}</p>
          </Card>
        ))}
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
        {asList(exercise.story).map((s) => (
          <Card key={s.text.slice(0, 30)} tone="story" title="My story — Mwata">
            <p>{s.text}</p>
          </Card>
        ))}
        {exercise.go_further && (
          <p className="rounded-2xl border border-line p-4 text-stone">{exercise.go_further}</p>
        )}

        {(isSummary || (!part.summary && exercise.id === part.exercises.at(-1)!.id)) && (
          <p className="rounded-2xl bg-success-soft p-4">
            <span className="font-semibold text-success">✓ Result: {part.finish.title}</span>
            {part.finish.description && <> — {part.finish.description}</>}
          </p>
        )}

        {/* One row: a step back, what this page is for, a step on. */}
        <div className="border-t border-line pt-6">
          <div className="flex items-center justify-center gap-3">
            {!free && <PageArrow direction="back" target={prevHere} step={stepNumber} />}
            {done ? (
              <span className="flex flex-col items-center gap-0.5">
                <span className="inline-flex items-center gap-2 font-semibold text-success">
                  <span aria-hidden>✓</span>
                  Done
                </span>
                <button className="text-sm text-stone underline" onClick={() => changeStatus("in_progress")}>
                  Mark as not done
                </button>
              </span>
            ) : (
              <button className="btn btn-primary" onClick={() => changeStatus("done")}>
                Mark as done
              </button>
            )}
            {!free && <PageArrow direction="on" target={nextHere} step={stepNumber} />}
          </div>
          <p className="mt-3 text-center">
            <SaveIndicator />
          </p>
          {statusError && (
            <p role="alert" className="mt-1 text-center text-sm text-ochre">
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

        {/* The pages of this part, and the way back out, in one line. */}
        <nav aria-label="The pages of this part" className={free ? "hidden" : "print:hidden"}>
          <PageChips
            step={stepNumber}
            part={part}
            statuses={statuses}
            currentId={exercise.id}
            lead={`${part.label}:`}
            nextPart={step.parts[step.parts.indexOf(part) + 1]}
            trailing={
              free ? { href: "/modules", label: "Back to the modules" } : { href: "/dashboard", label: "Back to overview" }
            }
          />
        </nav>
      </article>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        {!free && <PartnerPanel exerciseId={exercise.id} />}
        {/* The question your AI partner cannot answer goes to Mwata, with this
            page already named so nobody has to explain where they were. */}
        <p className="mt-3 text-center text-sm text-stone print:hidden">
          A question only Mwata can answer?{" "}
          <Link href={helpHref(stepNumber, displayTitle(exercise))} className="text-pine underline">
            Ask Mwata
          </Link>
        </p>
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
