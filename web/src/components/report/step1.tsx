"use client";
/*
 * My Working Direction — the result of Step 1, as three sheets of paper.
 *
 * Sheet 1  what I am choosing between, and what I will not give up
 * Sheet 2  where my life stands today, and the one block of the week I take back
 * Sheet 3  the first money picture, and what happens next
 *
 * The document is deliberately shorter than the workbook. It is the page
 * somebody shows a partner or an adviser, so it carries the decisions and the
 * numbers, not every line they wrote on the way there. Everything they wrote
 * is still in "Everything I wrote".
 */
import { Body, Cover, Footnote, Headline, Kicker, PageFoot, PageSetup, Pull, Rule, RunningHead, Sheet, Standfirst } from "./chrome";
import { AmountBars, Dumbbell, PhaseDots, ShareBars, Statement, money } from "./charts";
import type { Step1 } from "@/lib/report";
import { WAKING_HOURS } from "@/lib/report";

export function Step1Doc({
  r,
  who,
  when,
  currency,
  stepsDone,
  board,
}: {
  r: Step1;
  who: string;
  when: string;
  currency: string;
  stepsDone: { label: string; state: "done" | "here" | "open" }[];
  /** The vision board, when there is one: an extra sheet at the end. */
  board?: React.ReactNode;
}) {
  const of = board ? 4 : 3;
  const foot = (n: number) => <PageFoot who={who} page={n} of={of} />;

  return (
    <>
      <PageSetup />
      {/* ───────────────────────────── one ───────────────────────────── */}
      <Sheet>
        <Cover
          kicker="The Made Real Blueprint / Step 1"
          headline={r.cover.headline}
          tail={r.cover.tail}
          quote={r.cover.quote}
          who={who}
          when={when}
        />
        <Body>
          <div className="py-7">
            <PhaseDots steps={stepsDone} />
          </div>

          <Kicker>My working direction</Kicker>
          <Headline>{r.options.length > 1 ? "What I am choosing between" : "The direction I want to explore"}</Headline>

          {r.options.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-6">
              {r.options.map((o) => (
                <div key={o.letter}>
                  <p className="text-[8.5pt] font-semibold uppercase tracking-[0.12em] text-ochre">{o.letter}</p>
                  <p className="display mt-2 text-[15pt] leading-snug text-pine">{o.what}</p>
                  {o.doubt && <p className="mt-2 text-[10.5pt] text-stone">Not sure yet: {o.doubt}</p>}
                </div>
              ))}
            </div>
          ) : (
            r.directions && <p className="mt-6 whitespace-pre-line text-[11pt] leading-relaxed">{r.directions}</p>
          )}

          {r.protect && (
            <>
              <Rule />
              <div className="grid grid-cols-[62mm_1fr] gap-x-10">
                <h3 className="display text-[17pt] leading-snug text-pine">What I want to protect</h3>
                <p className="whitespace-pre-line text-[11pt] leading-relaxed">{r.protect}</p>
              </div>
            </>
          )}

          {r.values.length > 0 && (
            <p className="mt-8 text-[9.5pt] font-semibold uppercase tracking-[0.12em] text-ochre">
              {r.values.join("  ·  ")}
            </p>
          )}

          <Footnote>
            {r.choice ? `${r.choice}. ` : ""}
            {r.letGo ? `Let go for now: ${r.letGo}` : "A direction to investigate, not a final decision."}
          </Footnote>
        </Body>
        {foot(1)}
      </Sheet>

      {/* ───────────────────────────── two ───────────────────────────── */}
      <Sheet>
        <RunningHead where="Step 1 · Picture" />
        <Body>
          <Kicker>My starting point</Kicker>
          <Headline>What I want more of</Headline>
          {r.today && <Standfirst>{r.today}</Standfirst>}

          {r.wheel.length > 0 && (
            <div className="mt-9">
              <Dumbbell rows={r.wheel} />
              <Footnote>
                My own scores, 1–10. The second mark is where I want to be in a year, not something already achieved.
              </Footnote>
            </div>
          )}

          {(r.time.now !== null || r.time.want !== null) && (
            <div className="mt-10">
              <Kicker>Time I decide for myself</Kicker>
              <div className="mt-5">
                <ShareBars
                  rows={[
                    { label: "Now", percent: r.time.now ?? 0, tone: "pine" },
                    { label: "What I want", percent: r.time.want ?? 0, tone: "ochre" },
                  ]}
                />
              </div>
              <Footnote>
                {r.time.nowHours !== null
                  ? `${r.time.nowHours} of my ${WAKING_HOURS} waking hours a week are mine to choose. `
                  : ""}
                The second figure is what I am aiming at.
              </Footnote>
            </div>
          )}

          {(r.takeBack || r.strengths) && (
            <>
              <Rule />
              <div className="grid grid-cols-[72mm_1fr] gap-x-10">
                <div>
                  <Kicker>The first block I take back</Kicker>
                  <Pull className="mt-3">{r.takeBack}</Pull>
                </div>
                {r.strengths && <p className="whitespace-pre-line text-[11pt] leading-relaxed">{r.strengths}</p>}
              </div>
            </>
          )}
        </Body>
        {foot(2)}
      </Sheet>

      {/* ──────────────────────────── three ──────────────────────────── */}
      <Sheet last={!board}>
        <RunningHead where="Step 1 · Picture" />
        <Body>
          <Kicker>Money and momentum</Kicker>
          <Headline>{r.costs.complete && r.income.complete ? "A first money picture" : "A first picture, with gaps"}</Headline>
          <Standfirst>
            {r.costs.complete
              ? "These are my own figures for a month in the new life, and the income I can count on."
              : "This is a first estimate. Some costs are still marked unknown, so it is not a finished money check."}
          </Standfirst>

          <div className="mt-8">
            <AmountBars
              currency={currency}
              rows={[
                {
                  label: `Monthly costs${r.costs.complete ? "" : " · incomplete"}`,
                  amount: r.costs.value,
                  tone: "ochre",
                },
                { label: "Income I can count on", amount: r.income.value, tone: "pine" },
              ]}
            />
          </div>

          {r.balance !== null && (
            <div className="mt-8">
              <Statement value={money(Math.abs(r.balance), currency)} tone={r.balance < 0 ? "ochre" : "moss"}>
                <p className="font-semibold">{r.balance < 0 ? "short each month" : "left over each month"}</p>
                <p className="mt-1 text-stone">
                  {r.costs.complete
                    ? "On the costs and income recorded here."
                    : "On recorded costs only. No reliable runway until the missing costs are filled in."}
                </p>
              </Statement>
            </div>
          )}

          {(r.oneTime.value !== null || r.available !== null) && (
            <p className="mt-6 text-[11pt] leading-relaxed">
              {r.oneTime.value !== null ? `${money(r.oneTime.value, currency)} is recorded for the change itself. ` : ""}
              {r.available !== null
                ? `${money(r.available, currency)} is left to live on after the one-time costs, deposits${
                    r.reserve ? ` and a ${money(r.reserve, currency)} reserve` : ""
                  }.`
                : ""}
            </p>
          )}

          {r.mustHaves.length > 0 && (
            <div className="mt-9">
              <Kicker>What my new life must give me</Kicker>
              <p className="mt-3 text-[11pt] leading-relaxed">{r.mustHaves.map((m) => m.what).join("  ·  ")}</p>
            </div>
          )}

          {r.nextStep && (
            <div className="mt-8">
              <Kicker>My next small step, within two weeks</Kicker>
              <Pull className="mt-3">{r.nextStep}</Pull>
              {r.assumptions && <p className="mt-3 text-[10.5pt] text-stone">Still to check: {r.assumptions}</p>}
            </div>
          )}

          {(r.reviewWhen || r.continueOrStop) && (
            <div className="mt-8">
              <Kicker>{r.reviewWhen ? `Review / ${r.reviewWhen}` : "When I review this"}</Kicker>
              {r.continueOrStop && <p className="mt-3 text-[11pt] leading-relaxed">{r.continueOrStop}</p>}
            </div>
          )}

          {r.dealbreakers && <Footnote>Dealbreakers I carry forward: {r.dealbreakers}</Footnote>}
        </Body>
        {foot(3)}
      </Sheet>

      {board}
    </>
  );
}
