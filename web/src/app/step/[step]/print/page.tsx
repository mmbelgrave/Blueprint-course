"use client";
// The printable result of a step (brief 4.6): Step 1 "My Working Direction",
// Step 2 "My Explore Summary". "Save as PDF" uses the browser's print window.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pictureLinks, picturesAvailable } from "@/lib/backend/pictures";
import { RequireUser, Shell } from "@/components/Shell";
import { fieldAnswerText } from "@/lib/answer-text";
import { useApp } from "@/lib/app-state";
import { exerciseFields, getStep, PRODUCT, type Exercise, type StepContent } from "@/lib/content";
import { stepHref } from "@/lib/progress";

function Answers({ exercise, heading }: { exercise: Exercise; heading: boolean }) {
  const { answers } = useApp();
  const values = answers[exercise.id];
  const rows = exerciseFields(exercise)
    .map((f) => ({ label: f.label ?? f.hint ?? "", text: fieldAnswerText(exercise.id, f.id, values) }))
    .filter((r) => r.text);
  if (!rows.length) return null;
  return (
    <section className="break-inside-avoid space-y-4">
      {heading && <h2 className="border-b border-line pb-1 text-xl font-semibold text-pine">{exercise.title}</h2>}
      <dl className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="break-inside-avoid">
            <dt className="text-sm font-semibold uppercase tracking-wide text-ochre">{r.label}</dt>
            <dd className="mt-1 whitespace-pre-line text-lg">{r.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The pictures from 1.2, printed three to a row under the Working Direction. */
function BoardSection() {
  const { answers } = useApp();
  const pictures = Array.isArray(answers["1.2"]?.board) ? (answers["1.2"].board as { path: string; caption: string }[]) : [];
  const [links, setLinks] = useState<Record<string, string>>({});
  const paths = pictures.map((p) => p.path).join("|");

  useEffect(() => {
    if (!picturesAvailable || !paths) return;
    let cancelled = false;
    pictureLinks(paths.split("|"))
      .then((l) => !cancelled && setLinks(l))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (!pictures.length) return null;
  return (
    <section className="break-inside-avoid space-y-3">
      <h2 className="border-b border-line pb-1 text-xl text-pine">My board</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {pictures.map((p) => (
          <figure key={p.path} className="break-inside-avoid">
            {links[p.path] && (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed links
              <img src={links[p.path]} alt={p.caption || "A picture from my board"} className="aspect-[4/3] w-full rounded-lg object-cover" />
            )}
            {p.caption && <figcaption className="mt-1 text-sm text-stone">{p.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function PrintPage({ step }: { step: StepContent }) {
  const { profile, answers } = useApp();
  // The step's result is its last part (Part 5): the main page first, then the others.
  const result = step.parts.at(-1)!;
  const [main, ...others] = result.exercises;
  const mainFilled = exerciseFields(main).some((f) => fieldAnswerText(main.id, f.id, answers[main.id]));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <button className="btn btn-primary" onClick={() => window.print()}>
          Save as PDF
        </button>
        <span className="text-sm text-stone">In the window that opens, choose &ldquo;Save as PDF&rdquo;.</span>
        <Link href={stepHref(step.step.number)} className="ml-auto text-sm text-pine underline">
          Back to Step {step.step.number}
        </Link>
      </div>

      <article className="space-y-8 rounded-2xl bg-white p-6 sm:p-10 print:rounded-none print:p-0">
        <header className="border-b-4 border-pine pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-ochre">
            {PRODUCT.name} · {PRODUCT.edition} · Step {step.step.number} {step.step.title}
          </p>
          <h1 className="mt-1 text-4xl font-bold text-pine">{result.finish.title}</h1>
          {profile?.first_name && <p className="mt-1 text-lg text-stone">{profile.first_name}</p>}
          {result.finish.description && <p className="mt-2 text-stone">{result.finish.description}</p>}
        </header>

        {mainFilled ? (
          <Answers exercise={main} heading={false} />
        ) : (
          <p className="rounded-lg bg-sand p-4 print:hidden">
            Nothing written yet. Fill in {main.number ?? main.id} {main.title} first — then your page appears here.
          </p>
        )}
        {others.map((e) => (
          <Answers key={e.id} exercise={e} heading />
        ))}

        {step.step.number === 1 && <BoardSection />}

        <footer className="break-inside-avoid space-y-2 border-t border-line pt-6">
          <p>{step.closing.intro}</p>
          {step.closing.final.map((l) => (
            <p key={l} className="display text-pine">
              {l}
            </p>
          ))}
        </footer>
      </article>
    </>
  );
}

export default function Print() {
  const { step } = useParams<{ step: string }>();
  const content = getStep(Number(step));
  return (
    <Shell>
      <RequireUser>
        {content ? <PrintPage step={content} /> : <p>This step does not exist.</p>}
      </RequireUser>
    </Shell>
  );
}
