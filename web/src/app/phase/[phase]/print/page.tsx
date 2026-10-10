"use client";
/*
 * My Blueprint · Phase 1 · Choose it (spec §6.5).
 *
 * The document the website promises: "you finish with your own blueprint". It
 * gathers the three step results into four sheets — where the steps got to,
 * what the person is holding on to, the money, and what is still open.
 *
 * Every line is their own words, their own numbers, or a comparison between
 * two of their answers (lib/report.ts, lib/blueprint.ts). Nothing here is
 * written by an AI and nothing here is advice: this document leaves the app
 * and gets shown to partners and advisers, so it may never say anything that
 * could be wrong.
 */
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { RequireUser, Shell } from "@/components/Shell";
import { BlueprintDoc } from "@/components/report/blueprint";
import { stepFor } from "@/lib/access-app";
import { exerciseAnswerLines } from "@/lib/answer-text";
import { useApp } from "@/lib/app-state";
import { blueprintReport, changePlan, type Answers } from "@/lib/report";
import { partItems, PRODUCT } from "@/lib/content";
import { useStepsContent } from "@/lib/use-step-content";
import { downloadText, fileName, writtenText } from "@/lib/written-text";

const PHASES: Record<string, { name: string; steps: number[] }> = {
  "1": { name: "Phase 1 · Choose it", steps: [1, 2, 3] },
};

function Blueprint({ phase }: { phase: { name: string; steps: number[] } }) {
  const { answers, entitlements, profile } = useApp();
  const a = answers as Answers;
  const currency = profile?.currency ?? "EUR";
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const who = profile?.first_name ?? "";

  // A step nobody owns is not gathered here either.
  const mine = phase.steps.filter((n) => stepFor(n, entitlements).open);
  const words = useStepsContent(mine);
  const r = blueprintReport(a);

  /*
   * The text file carries the step results, which are the person's own
   * writing. The worked-out pages — the money thread, the five lights — are
   * comparisons drawn on paper and read as a picture; flattened into a text
   * file they would mislead more than they help, so the file says where to
   * find them.
   */
  const lastRealPart = <T extends { optional?: boolean }>(ps: T[]): T | undefined =>
    ps.filter((p) => !p.optional).at(-1) ?? ps.at(-1);

  const asText = () =>
    writtenText({
      title: `${PRODUCT.name} — My Blueprint · ${phase.name}`,
      who,
      when: today,
      note: "My step results, in my own words. The money, the five lights and what is still open are on the printed Blueprint.",
      sections: mine.flatMap((n) => {
        const full = words.ready.get(n);
        const result = full ? lastRealPart(full.parts) : undefined;
        if (!full || !result) return [];
        return [
          {
            title: `Step ${n} · ${full.step.title} — ${result.finish.title}`,
            pages: partItems(result).map((page) => ({
              title: page.title,
              lines: exerciseAnswerLines(page.id, answers[page.id], page, "\n"),
            })),
          },
        ];
      }),
      footer: `© ${new Date().getFullYear()} ${PRODUCT.copyright_holder} · ${PRODUCT.name} — ${PRODUCT.edition}. My answers are my own. This copy is for my personal use; the workbook text and layout may not be copied or shared.`,
    });

  // "Download" on the Phase page is a link to this page asking for the file.
  const asked = useSearchParams().get("download") === "1";
  const handed = useRef(false);
  useEffect(() => {
    if (!asked || handed.current || words.loading) return;
    handed.current = true;
    downloadText(fileName(`my blueprint ${phase.name}`), asText());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked, words.loading]);

  return (
    <>
      <div className="mb-6 print:hidden">
        <p className="flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={() => window.print()}>
            Print or save as PDF
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => downloadText(fileName(`my blueprint ${phase.name}`), asText())}
          >
            Download the file
          </button>
        </p>
        <p className="mt-2 text-center text-sm text-stone">
          In the window that opens, choose &ldquo;Save as PDF&rdquo;.
        </p>
      </div>

      <BlueprintDoc
        r={r}
        plan={changePlan(a)}
        who={who}
        when={r.dates.three || today}
        currency={currency}
        phaseName={phase.name.replace(" · ", " · ")}
      />

      <p className="mt-8 text-center print:hidden">
        <Link href="/modules/phase-1" className="text-pine hover:underline">
          ← Back to Phase 1
        </Link>
      </p>
    </>
  );
}

export default function PhaseBlueprint() {
  const { phase } = useParams<{ phase: string }>();
  const found = PHASES[String(phase)];
  return (
    <Shell wide>
      <RequireUser>
        {found ? (
          <Suspense fallback={<p className="py-16 text-center text-stone">One moment…</p>}>
            <Blueprint phase={found} />
          </Suspense>
        ) : (
          <p className="text-center">
            That phase does not have a blueprint yet.{" "}
            <Link href="/modules" className="underline">
              Back to the modules
            </Link>
          </p>
        )}
      </RequireUser>
    </Shell>
  );
}
