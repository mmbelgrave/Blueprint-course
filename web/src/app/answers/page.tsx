"use client";
/*
 * "Everything I wrote" (spec §6.6): every page of every step, in order, with
 * the answers underneath. Printable, so the browser's print window saves it as
 * a PDF — the same way the step results and the Blueprint are saved.
 *
 * This is the readable copy. The file for machines is /api/account/export.
 */
import Link from "next/link";
import { RequireUser, Shell } from "@/components/Shell";
import { useApp } from "@/lib/app-state";
import { exerciseAnswerLines } from "@/lib/answer-text";
import { displayTitle, partItems, PRODUCT, steps } from "@/lib/content";
import { useStepsContent } from "@/lib/use-step-content";
import { downloadText, fileName, writtenText } from "@/lib/written-text";

export default function MyAnswers() {
  const { answers, profile, statuses } = useApp();
  /*
   * The questions live on the server now, so they are asked for. A free account
   * gets back only the pages that are free, which is exactly the set they can
   * have written anything on.
   */
  const words = useStepsContent(steps.map((s) => s.step.number));
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  // Only the steps this person actually wrote in: an empty step is noise.
  const written = steps
    .map((step) => {
      const full = words.ready.get(step.step.number);
      const pagesOf = (partId: string) => {
        const part = full?.parts.find((p) => p.id === partId);
        return part ? partItems(part) : [];
      };
      return {
        step,
        parts: step.parts
          .map((part) => ({
            part,
            pages: pagesOf(part.id)
              .map((page) => ({ page, lines: exerciseAnswerLines(page.id, answers[page.id], page, "\n") }))
              .filter((p) => p.lines.length > 0),
          }))
          .filter((p) => p.pages.length > 0),
      };
    })
    .filter((s) => s.parts.length > 0);

  const pagesDone = Object.values(statuses).filter((s) => s === "done").length;

  const asText = () =>
    writtenText({
      title: `${PRODUCT.name} — Everything I wrote`,
      who: profile?.first_name ?? undefined,
      when: today,
      note: `${pagesDone} ${pagesDone === 1 ? "page" : "pages"} marked done.`,
      sections: written.flatMap(({ step, parts }) =>
        parts.map(({ part, pages }) => ({
          title: `Step ${step.step.number} · ${step.step.title} — ${part.label} · ${part.title}`,
          pages: pages.map(({ page, lines }) => ({ title: displayTitle(page), lines })),
        })),
      ),
      footer: `© ${new Date().getFullYear()} ${PRODUCT.copyright_holder} · ${PRODUCT.name} — ${PRODUCT.edition}. Your answers are your own. This copy is for your personal use; the workbook text and layout may not be copied or shared.`,
    });

  return (
    <Shell>
      <RequireUser>
        <div className="print:hidden">
          <p className="mb-6 flex flex-wrap justify-center gap-3">
            <button className="btn btn-primary" onClick={() => window.print()}>
              Print or save as PDF
            </button>
            <button className="btn btn-ghost" onClick={() => downloadText(fileName("everything I wrote"), asText())}>
              Download the file
            </button>
          </p>
        </div>

        <article className="mx-auto max-w-[210mm] rounded-2xl bg-white p-8 print:max-w-none print:rounded-none print:p-0">
          <header className="border-b border-line pb-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-ochre">
              {PRODUCT.name} · {PRODUCT.edition}
            </p>
            <h1 className="mt-2 text-3xl text-pine">Everything I wrote</h1>
            <p className="mt-1 text-stone">
              {profile?.first_name ? `${profile.first_name} · ` : ""}
              {today} · {pagesDone} {pagesDone === 1 ? "page" : "pages"} marked done
            </p>
          </header>

          {words.loading ? (
            <p className="py-10 text-center text-stone">One moment…</p>
          ) : written.length === 0 ? (
            <p className="mt-6 text-stone">
              You have not written anything yet. Once you do, it all appears here.{" "}
              <Link href="/dashboard" className="underline">
                Start a step
              </Link>
              .
            </p>
          ) : (
            written.map(({ step, parts }) => (
              <section key={step.step.id} className="mt-8 break-inside-avoid">
                <h2 className="text-2xl text-pine">
                  Step {step.step.number} · {step.step.title}
                </h2>
                {parts.map(({ part, pages }) => (
                  <div key={part.id} className="mt-5">
                    <h3 className="text-lg text-pine">
                      {part.label} · {part.title}
                    </h3>
                    {pages.map(({ page, lines }) => (
                      <div key={page.id} className="mt-4 break-inside-avoid border-l-2 border-line pl-4">
                        <p className="text-sm font-semibold text-ochre">{displayTitle(page)}</p>
                        {lines.map((line) => (
                          <p key={line.label} className="mt-2">
                            <span className="block text-sm text-stone">{line.label}</span>
                            <span className="block whitespace-pre-line">{line.text}</span>
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))
          )}

          <footer className="mt-10 border-t border-line pt-4 text-xs text-stone">
            © {new Date().getFullYear()} {PRODUCT.copyright_holder} · {PRODUCT.name} — {PRODUCT.edition}. Your answers
            are your own. This copy is for your personal use; the workbook text and layout may not be copied or shared.
          </footer>
        </article>

        <p className="mt-8 text-center print:hidden">
          <Link href="/settings" className="text-pine hover:underline">
            ← Back to settings
          </Link>
        </p>
      </RequireUser>
    </Shell>
  );
}
