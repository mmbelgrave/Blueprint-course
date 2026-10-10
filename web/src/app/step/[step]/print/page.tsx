"use client";
/*
 * The result of a step, as a document (spec §6.5).
 *
 * Step 1 ends in My Working Direction, Step 2 in My Explore Summary, Step 3 in
 * My Decision. Each one is a short set of A4 sheets built from the person's
 * own answers — laid out as paper, because this is the thing they show to a
 * partner, a parent or an adviser, and read by somebody who was not there.
 *
 * What goes on each page is decided in lib/report.ts; how a page looks is in
 * components/report. This file is only the plumbing: who may see it, where
 * the words come from, and the two buttons at the top.
 */
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { pictureLinks, picturesAvailable } from "@/lib/backend/pictures";
import { ClosedStep } from "@/components/closed-step";
import { stepFor } from "@/lib/access-app";
import { useStepContent } from "@/lib/use-step-content";
import { RequireUser, Shell } from "@/components/Shell";
import { exerciseAnswerLines } from "@/lib/answer-text";
import { useApp } from "@/lib/app-state";
import { Body, Footnote, Headline, Kicker, PageFoot, RunningHead, Sheet } from "@/components/report/chrome";
import { Step1Doc } from "@/components/report/step1";
import { Step2Doc } from "@/components/report/step2";
import { Step3Doc } from "@/components/report/step3";
import { changePlan, step1Report, step2Report, step3Report, type Answers } from "@/lib/report";
import { stepsFinished } from "@/lib/blueprint";
import { getStep, partItems, PRODUCT, type StepContent } from "@/lib/content";
import { stepHref } from "@/lib/progress";
import { downloadText, fileName, writtenText } from "@/lib/written-text";

/** The pictures from 1.2, as the last sheet of Step 1's document. */
function BoardSheet({ who, page, of }: { who: string; page: number; of: number }) {
  const { answers } = useApp();
  const pictures = Array.isArray(answers["1.2"]?.board)
    ? (answers["1.2"].board as { path: string; caption: string }[])
    : [];
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
    <Sheet last>
      <RunningHead where="Step 1 · Picture" />
      <Body>
        <Kicker>My board</Kicker>
        <Headline>The pictures I chose</Headline>
        <div className="mt-8 grid grid-cols-3 gap-4">
          {pictures.map((p) => (
            <figure key={p.path} className="break-inside-avoid">
              {links[p.path] && (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed links
                <img
                  src={links[p.path]}
                  alt={p.caption || "A picture from my board"}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              )}
              {p.caption && <figcaption className="mt-2 text-[9.5pt] text-stone">{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
        <Footnote>The pictures I put on my board in 1.2, with the lines I wrote under them.</Footnote>
      </Body>
      <PageFoot who={who} page={page} of={of} />
    </Sheet>
  );
}

function Document({ step }: { step: StepContent }) {
  const { profile, answers } = useApp();
  const a = answers as Answers;
  const n = step.step.number;
  const who = profile?.first_name ?? "";
  const currency = profile?.currency ?? "EUR";
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  /* The step's result is its last part, but never an optional one: Step 3 ends
     with the staying route, which only some people do. */
  const result = step.parts.filter((p) => !p.optional).at(-1) ?? step.parts.at(-1)!;
  /* …but if they did do it, it belongs in the file too, under its own heading. */
  const staying = step.parts.filter((p) => p.optional && p !== result);

  const asText = () =>
    writtenText({
      title: `${PRODUCT.name} — ${result.finish.title}`,
      who: who || undefined,
      when: `Step ${n} · ${step.step.title} · ${today}`,
      note: result.finish.description ?? undefined,
      // The part, not the result: the document is already called that. The
      // staying route follows it when somebody took that road.
      sections: [result, ...staying].map((part) => ({
        title: `${part.label} · ${part.title}`,
        pages: partItems(part).map((page) => ({
          title: page.title,
          lines: exerciseAnswerLines(page.id, answers[page.id], page, "\n"),
        })),
      })),
      footer: `© ${new Date().getFullYear()} ${PRODUCT.copyright_holder} · ${PRODUCT.name} — ${PRODUCT.edition}. My answers are my own. This copy is for my personal use; the workbook text and layout may not be copied or shared.`,
    });

  /* "Download" on the step page is a link to this page asking for the file. */
  const asked = useSearchParams().get("download") === "1";
  const handed = useRef(false);
  useEffect(() => {
    if (!asked || handed.current) return;
    handed.current = true;
    downloadText(fileName(result.finish.title), asText());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);

  const done = stepsFinished(a);
  const dots = ([1, 2, 3] as const).map((s) => ({
    label: ["Picture", "Explore", "Decide"][s - 1],
    state: (s === n ? "here" : done.find((d) => d.step === s)?.finished ? "done" : "open") as "here" | "done" | "open",
  }));

  const hasBoard = n === 1 && Array.isArray(answers["1.2"]?.board) && (answers["1.2"].board as unknown[]).length > 0;
  const when = (page: string, field: string) => (typeof a[page]?.[field] === "string" ? (a[page]![field] as string) : "");

  return (
    <>
      <div className="mb-6 print:hidden">
        <p className="flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={() => window.print()}>
            Print or save as PDF
          </button>
          <button className="btn btn-ghost" onClick={() => downloadText(fileName(result.finish.title), asText())}>
            Download the file
          </button>
        </p>
        <p className="mt-2 text-center text-sm text-stone">
          In the window that opens, choose &ldquo;Save as PDF&rdquo;.
        </p>
      </div>

      {n === 1 && (
        <Step1Doc
          r={step1Report(a)}
          who={who}
          when={when("5.1", "date") || today}
          currency={currency}
          stepsDone={dots}
          board={hasBoard ? <BoardSheet who={who} page={4} of={4} /> : undefined}
        />
      )}
      {n === 2 && (
        <Step2Doc r={step2Report(a)} who={who} when={when("s2-5.1", "date") || today} currency={currency} />
      )}
      {n === 3 && (
        <Step3Doc
          r={step3Report(a)}
          plan={changePlan(a)}
          who={who}
          when={when("s3-4.2", "first_step_date") || when("s3-0.1", "decide_by") || today}
          currency={currency}
        />
      )}
      {n > 3 && (
        <Sheet last>
          <RunningHead where={`Step ${n}`} />
          <Body>
            <Kicker>{result.finish.title}</Kicker>
            <Headline>This step&rsquo;s document is still being written</Headline>
            <Footnote>Everything you wrote is safe, and is in &ldquo;Everything I wrote&rdquo;.</Footnote>
          </Body>
          <PageFoot who={who} page={1} of={1} />
        </Sheet>
      )}

      <p className="mt-8 text-center print:hidden">
        <Link href={stepHref(n)} className="text-pine hover:underline">
          ← Back to Step {n}
        </Link>
      </p>
    </>
  );
}

export default function Print() {
  const { step } = useParams<{ step: string }>();
  const { entitlements } = useApp();
  const content = getStep(Number(step));
  const page = useStepContent(content ? Number(step) : undefined);
  const verdict = stepFor(Number(step), entitlements);
  return (
    <Shell wide>
      <RequireUser>
        {content && !verdict.open ? (
          <ClosedStep step={Number(step)} why={verdict.why} />
        ) : !content ? (
          <p>This step does not exist.</p>
        ) : page.state === "ready" ? (
          <Suspense fallback={<p className="py-16 text-center text-stone">One moment…</p>}>
            <Document step={page.content} />
          </Suspense>
        ) : page.state === "refused" ? (
          <p className="text-center">{page.because}</p>
        ) : (
          <p className="py-16 text-center text-stone">One moment…</p>
        )}
      </RequireUser>
    </Shell>
  );
}
