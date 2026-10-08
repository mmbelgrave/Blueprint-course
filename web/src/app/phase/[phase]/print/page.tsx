"use client";
/*
 * My Blueprint · Phase 1 · Choose it (spec §6.5).
 *
 * The document the website promises: "you finish with your own blueprint". It
 * holds the three step results, and three things the person has never seen —
 * their decision on one page, their money from first guess to checked figure,
 * and the places where two things they wrote themselves do not yet agree.
 *
 * Every line is their own words, their own numbers, or a comparison between
 * two of their answers (lib/blueprint.ts). Nothing here is written by an AI and
 * nothing here is advice: this document leaves the app and gets shown to
 * partners and advisers, so it may never say anything that could be wrong.
 *
 * Saved as a PDF through the browser's print window, like the step results.
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mark } from "@/components/brand";
import { RequireUser, Shell } from "@/components/Shell";
import { exerciseAnswerLines } from "@/lib/answer-text";
import {
  headline,
  lights,
  moneyThread,
  stepsFinished,
  whatChanged,
  whatDoesNotLineUp,
  whatHappensNext,
  type Answers as BlueprintAnswers,
} from "@/lib/blueprint";
import { useApp } from "@/lib/app-state";
import { getStep, partItems, PRODUCT } from "@/lib/content";

const PHASES: Record<string, { name: string; steps: number[] }> = {
  "1": { name: "Phase 1 · Choose it", steps: [1, 2, 3] },
};

const money = (n: number | null, currency: string) =>
  n === null ? "—" : `${currency} ${Math.round(n).toLocaleString()}`;

/** A sheet of the document. On paper each one starts a new page. */
function Sheet({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <section
      className={`mx-auto mb-6 max-w-[210mm] overflow-hidden rounded-2xl shadow-sm print:mb-0 print:max-w-none print:break-after-page print:rounded-none print:shadow-none ${
        dark ? "bg-pine text-sand" : "bg-white"
      }`}
    >
      {children}
    </section>
  );
}

function Blueprint({ phase }: { phase: { name: string; steps: number[] } }) {
  const { answers, profile } = useApp();
  const a = answers as BlueprintAnswers;
  const currency = profile?.currency ?? "EUR";
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const who = profile?.first_name ?? "";

  const done = stepsFinished(a);
  const head = headline(a);
  const m = moneyThread(a);
  const flags = whatDoesNotLineUp(a, currency);
  const next = whatHappensNext(a);
  const changed = whatChanged(a);
  const five = lights(a);

  const dotFor = (colour: string) =>
    colour.toLowerCase() === "green"
      ? "bg-moss"
      : colour.toLowerCase() === "red"
        ? "bg-error"
        : colour.toLowerCase() === "amber"
          ? "bg-ochre-light"
          : "bg-line";

  return (
    <>
      <p className="mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center gap-3 print:hidden">
        <Link href="/modules/phase-1" className="text-pine hover:underline">
          ← Back to Phase 1
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </p>

      {/* ── The cover ── */}
      <Sheet dark>
        <div className="flex min-h-[240mm] flex-col justify-between p-10 print:min-h-[257mm]">
          <div>
            <Mark size={66} />
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-ochre-light">
              {PRODUCT.name} · {PRODUCT.edition}
            </p>
            <h1 className="mt-3 text-5xl leading-none text-sand">My Blueprint</h1>
            <p className="display mt-2 text-2xl text-ochre-light">{phase.name}</p>
            <p className="mt-8 text-sand/85">
              {who ? `${who} · ` : ""}
              {today}
            </p>
          </div>
          <div className="mt-10 border-t border-sand/25 pt-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ochre-light">
              What this document holds
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sand/90">
              <li>My decision, in one page</li>
              <li>The money, from first guess to checked figure</li>
              <li>What does not line up yet, and what happens next</li>
              <li>
                {phase.steps
                  .map((n) => getStep(n)?.parts.at(-1)?.finish.title)
                  .filter(Boolean)
                  .join(", ")}{" "}
                in full
              </li>
            </ol>
          </div>
        </div>
      </Sheet>

      {/* ── The decision in one page ── */}
      <Sheet>
        <div className="space-y-6 p-10">
          <header>
            <h2 className="text-2xl text-pine">Your decision in one page</h2>
            <p className="mt-1 text-stone">Everything after this page is the evidence behind it, in your own words.</p>
          </header>

          {head.decision ? (
            <div className="bg-pine p-7 text-sand">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ochre-light">My decision</p>
              <p className="display mt-1 text-3xl leading-tight">{head.decision}</p>
              {head.question && <p className="mt-3 text-sand/85">{head.question}</p>}
              {head.conditions && <p className="mt-3 text-sand/85">On condition that: {head.conditions}</p>}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line p-5 text-stone">
              Step 3 is not finished yet, so there is no decision to show here.{" "}
              <Link href="/step/3" className="underline print:hidden">
                Finish Step 3
              </Link>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ochre">The place</p>
              <p className="display mt-1 text-xl text-pine">{head.place || "—"}</p>
              {head.where && <p className="mt-1 text-sm text-stone">{head.where}</p>}
            </div>
            <div className="border border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ochre">The money</p>
              <p className="display mt-1 text-xl text-pine">
                {m.runwayMonths !== null
                  ? `${m.runwayMonths} months`
                  : m.balance !== null && m.balance >= 0
                    ? "Covered each month"
                    : "—"}
              </p>
              <p className="mt-1 text-sm text-stone">
                {m.found !== null || m.guessed !== null
                  ? `${money(m.found ?? m.guessed, currency)} a month, ${money(m.income, currency)} income, ${money(m.savings, currency)} put aside`
                  : "Not worked out yet"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ochre">My five green lights</p>
            <ul className="mt-2 grid grid-cols-5 gap-2">
              {five.map((l) => (
                <li key={l.name} className="border border-line p-3 text-center">
                  <span className={`mx-auto mb-2 block h-5 w-5 rounded-full ${dotFor(l.colour)}`} aria-hidden />
                  <span className="block text-sm font-semibold text-pine">{l.name}</span>
                  <span className="block text-xs text-stone">{l.colour || "—"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ochre">My first step</p>
              <p className="display mt-1 text-lg text-pine">{head.firstStep || "—"}</p>
              {head.firstStepDate && <p className="mt-1 text-sm text-stone">{head.firstStepDate}</p>}
            </div>
            <div className="border border-line p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ochre">I look at this again</p>
              <p className="display mt-1 text-lg text-pine">{head.reviewWhen || "—"}</p>
            </div>
          </div>
        </div>
      </Sheet>

      {/* ── The money thread ── */}
      <Sheet>
        <div className="space-y-6 p-10">
          <header>
            <h2 className="text-2xl text-pine">The money, from first guess to checked figure</h2>
            <p className="mt-1 text-stone">
              You wrote these numbers weeks apart. This is the only place they sit side by side.
            </p>
          </header>

          <table className="w-full">
            <tbody>
              {[
                ["Step 1", money(m.guessed, currency), "what you thought a month would cost"],
                ["Step 2", money(m.found, currency), "what you found, against real prices"],
                ["Income", money(m.income, currency), "what you can count on each month"],
                ["Put aside", money(m.savings, currency), "savings you can reach within a month"],
              ].map(([label, figure, says]) => (
                <tr key={label} className="border-b border-line">
                  <td className="py-3 pr-4 text-sm text-stone">{label}</td>
                  <td className="display w-32 py-3 text-right text-lg text-pine tabular">{figure}</td>
                  <td className="py-3 pl-4 text-sm">{says}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(m.overTwentyPercent || m.runwayMonths !== null || (m.balance !== null && m.balance >= 0)) && (
            <div className="border-l-4 border-ochre bg-ochre-soft p-5">
              {m.overTwentyPercent && m.differencePercent !== null && (
                <p>
                  Your checked costs are <strong>{Math.abs(m.differencePercent)}%</strong>{" "}
                  {m.differencePercent > 0 ? "higher" : "lower"} than your first guess. Step 2 asks you to go back
                  through both sets of figures when they differ by more than 20%.
                </p>
              )}
              {m.balance !== null && m.balance < 0 && m.runwayMonths !== null && (
                <p className={m.overTwentyPercent ? "mt-3" : ""}>
                  You are <strong>{money(-m.balance, currency)} short each month</strong>, which your savings cover for
                  about <strong>{m.runwayMonths} months</strong>. That is your runway if nothing changes.
                </p>
              )}
              {m.balance !== null && m.balance >= 0 && (
                <p className={m.overTwentyPercent ? "mt-3" : ""}>
                  Your income covers the month, with <strong>{money(m.balance, currency)}</strong> left over.
                </p>
              )}
            </div>
          )}

          {changed.length > 0 && (
            <div>
              <h3 className="text-xl text-pine">What changed along the way</h3>
              {changed.map((c) => (
                <p key={c.label} className="mt-3">
                  <span className="block text-sm font-semibold text-ochre">{c.label}</span>
                  <span className="block whitespace-pre-line">{c.text}</span>
                </p>
              ))}
            </div>
          )}

          <p className="border-t border-line pt-4 text-xs text-stone">
            Every figure on this page comes from your own answers. Nothing is estimated for you.
          </p>
        </div>
      </Sheet>

      {/* ── What does not line up, and what happens next ── */}
      <Sheet>
        <div className="space-y-6 p-10">
          <header>
            <h2 className="text-2xl text-pine">What does not line up yet</h2>
            <p className="mt-1 text-stone">
              Not advice — just the places where two things you wrote yourself do not yet agree. Each one names where it
              came from.
            </p>
          </header>

          {flags.length === 0 ? (
            <p className="text-stone">Nothing to report yet. Finish a step and this page fills itself in.</p>
          ) : (
            <ul>
              {flags.map((f, i) => (
                <li key={i} className="flex gap-4 border-b border-line py-4">
                  <span
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full ${
                      f.tone === "green" ? "bg-moss" : f.tone === "red" ? "bg-error" : "bg-ochre-light"
                    }`}
                    aria-hidden
                  />
                  <span>
                    <span className="block font-semibold text-pine">{f.title}</span>
                    <span className="display mt-1 block whitespace-pre-line">{f.quote}</span>
                    <span className="mt-1 block text-sm text-stone">{f.where}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <header className="pt-4">
            <h2 className="text-2xl text-pine">What happens next</h2>
            <p className="mt-1 text-stone">Your own dates, in order. Nothing here was chosen for you.</p>
          </header>

          {next.length === 0 ? (
            <p className="text-stone">No dates written down yet.</p>
          ) : (
            <ol className="border-l-2 border-line pl-6">
              {next.map((n, i) => (
                <li key={i} className="relative py-3">
                  <span
                    className="absolute -left-[1.85rem] top-5 h-2.5 w-2.5 rounded-full bg-ochre"
                    aria-hidden
                  />
                  <span className="block text-sm font-semibold uppercase tracking-wide text-ochre">{n.when}</span>
                  <span className="block">{n.what}</span>
                  <span className="block text-sm text-stone">{n.where}</span>
                </li>
              ))}
            </ol>
          )}

          <p className="border-t border-line pt-4 text-xs text-stone">
            Step 4, Prepare, turns this into a moving plan. Until then, this is your plan.
          </p>
        </div>
      </Sheet>

      {/* ── The three results, in order ── */}
      {phase.steps.map((n) => {
        const step = getStep(n);
        const finished = done.find((d) => d.step === n)?.finished;
        if (!step) return null;
        const result = step.parts.at(-1)!;
        const pages = partItems(result)
          .map((page) => ({ page, lines: exerciseAnswerLines(page.id, answers[page.id]) }))
          .filter((p) => p.lines.length > 0);

        return (
          <Sheet key={n}>
            <header className="bg-pine px-10 py-9 text-sand">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ochre-light">
                Step {step.step.number} · {step.step.title}
              </p>
              <h2 className="display mt-2 text-3xl">{result.finish.title}</h2>
              {who && <p className="mt-2 text-sand/85">{who}</p>}
            </header>
            <div className="space-y-5 p-10">
              {!finished || pages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-5 text-stone">
                  Not finished yet.{" "}
                  <Link href={`/step/${n}`} className="underline print:hidden">
                    Go to Step {n}
                  </Link>
                </p>
              ) : (
                pages.map(({ page, lines }) =>
                  lines.map((line) => (
                    <p key={`${page.id}-${line.label}`}>
                      <span className="block text-sm font-semibold text-ochre">{line.label}</span>
                      <span className="block whitespace-pre-line">{line.text}</span>
                    </p>
                  )),
                )
              )}
              <p className="border-t border-line pt-4 text-xs text-stone">
                Step {n} · My Blueprint · {phase.name}
              </p>
            </div>
          </Sheet>
        );
      })}

      <Sheet>
        <div className="space-y-5 p-10">
          <p className="display text-xl leading-snug text-pine">
            You will never be completely sure.
            <br />
            But you can be ready enough, and know what to do next.
          </p>
          <p className="border-t border-line pt-4 text-xs text-stone">
            © {new Date().getFullYear()} {PRODUCT.copyright_holder} · {PRODUCT.name} — {PRODUCT.edition}. Your answers
            are your own. This document is for your personal use; the workbook text and layout may not be copied or
            shared.
          </p>
        </div>
      </Sheet>
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
          <Blueprint phase={found} />
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
