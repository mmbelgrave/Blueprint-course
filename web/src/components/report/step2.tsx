"use client";
/*
 * My Explore Summary — the result of Step 2, as three sheets of paper.
 *
 * Sheet 1  the place, and the life around the front door
 * Sheet 2  what the research and the visit actually said
 * Sheet 3  the guess against what it really costs, and what is still open
 */
import { Body, Cover, Footnote, Headline, Kicker, PageFoot, PageSetup, Rule, RunningHead, Sheet, Standfirst } from "./chrome";
import { AmountBars, Hub, Quote, ScoreBars, Statement, money } from "./charts";
import type { Step2 } from "@/lib/report";

export function Step2Doc({
  r,
  who,
  when,
  currency,
}: {
  r: Step2;
  who: string;
  when: string;
  currency: string;
}) {
  const foot = (n: number) => <PageFoot who={who} page={n} of={3} />;
  const scores = r.regions.length > 0 ? r.regions : r.countries;
  // The one they chose, which is not always the one with the highest total.
  const chosen = scores.find((s) => r.chose.toLowerCase().includes(s.label.toLowerCase()))?.label;
  const balance = r.found.value !== null && r.income.value !== null ? r.income.value - r.found.value : null;
  const moved =
    r.guess.value !== null && r.found.value !== null ? r.found.value - r.guess.value : null;

  return (
    <>
      <PageSetup />
      {/* ───────────────────────────── one ───────────────────────────── */}
      <Sheet>
        <Cover
          kicker="The Made Real Blueprint / Step 2"
          headline={r.cover.headline}
          tail={r.cover.tail}
          quote={r.cover.quote}
          lines={[r.where].filter(Boolean)}
          who={who}
          when={when}
        />
        <Body>
          {r.spokes.length > 0 ? (
            <>
              <div className="pt-10">
                <Kicker>The life around the house</Kicker>
              </div>
              <div className="mt-10">
                <Hub centre="The place I am exploring" spokes={r.spokes} />
              </div>
              <Footnote>
                Travel times as I recorded them, not measured on a map. A green dot is something I checked; an ochre
                dot is still an estimate.
              </Footnote>
            </>
          ) : (
            <div className="pt-10">
              <Kicker>The place</Kicker>
              {r.reasons && <p className="mt-4 whitespace-pre-line text-[11pt] leading-relaxed">{r.reasons}</p>}
            </div>
          )}

          <Rule />
          <p className="display text-[17pt] leading-snug text-pine">{r.choice}</p>
          {r.notGive && <p className="mt-3 text-[11pt] leading-relaxed text-stone">{r.notGive}</p>}
        </Body>
        {foot(1)}
      </Sheet>

      {/* ───────────────────────────── two ───────────────────────────── */}
      <Sheet>
        <RunningHead where="Step 2 · Explore" />
        <Body>
          <Kicker>From research to real life</Kicker>
          <Headline>What I learned here</Headline>
          {r.confirmed && <Standfirst>{r.confirmed}</Standfirst>}

          {scores.length > 0 && (
            <div className="mt-9">
              <Kicker>{r.regions.length > 0 ? "Regions / my scores out of 20" : "Countries / my scores out of 20"}</Kicker>
              <div className="mt-5">
                <ScoreBars
                  outOf={20}
                  rows={scores.map((s) => ({ label: s.label, score: s.score, chosen: s.label === chosen }))}
                />
              </div>
              <Footnote>
                My own scores on the workbook&rsquo;s ten factors. The highest total is not automatically the right
                answer; it is a way of seeing where they differ.
              </Footnote>
            </div>
          )}

          {r.voices.length > 0 && (
            <>
              <Rule />
              <Kicker>The visit / in my own words</Kicker>
              <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-8">
                {r.voices.slice(0, 2).map((v) => (
                  <Quote key={v.who} text={v.words} who={v.who} />
                ))}
              </div>
            </>
          )}

          {r.changed && (
            <div className="mt-9">
              <Kicker>What changed</Kicker>
              <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{r.changed}</p>
            </div>
          )}
        </Body>
        {foot(2)}
      </Sheet>

      {/* ──────────────────────────── three ──────────────────────────── */}
      <Sheet last>
        <RunningHead where="Step 2 · Explore" />
        <Body>
          <Kicker>The next checks</Kicker>
          <Headline>{r.found.complete ? "More real than the guess" : "More real, not yet complete"}</Headline>

          {(r.guess.value !== null || r.found.value !== null) && (
            <>
              <div className="mt-8">
                <AmountBars
                  currency={currency}
                  rows={[
                    { label: "Step 1 · what I guessed a month would cost", amount: r.guess.value, tone: "muted" },
                    {
                      label: `Step 2 · what I found${r.found.complete ? "" : " · incomplete"}`,
                      amount: r.found.value,
                      tone: "pine",
                    },
                  ]}
                />
              </div>
              {moved !== null && (
                <p className="mt-6 text-[11pt] leading-relaxed">
                  {moved === 0
                    ? "The guess held."
                    : `What I found is ${money(Math.abs(moved), currency)} ${moved > 0 ? "more" : "less"} than I guessed.`}{" "}
                  {r.monthlyCost}
                </p>
              )}
            </>
          )}

          {balance !== null && (
            <div className="mt-8">
              <Statement value={`${balance < 0 ? "−" : "+"}${money(Math.abs(balance), currency)}`} tone={balance < 0 ? "ochre" : "moss"}>
                <p className="font-semibold">a month, on the income I can count on</p>
                <p className="mt-1 text-stone">{r.incomeThere}</p>
              </Statement>
            </div>
          )}

          {r.unknowns.length > 0 && (
            <div className="mt-9">
              <Kicker>Open before the next decision</Kicker>
              <ul className="mt-4">
                {r.unknowns.slice(0, 6).map((u) => (
                  <li key={u} className="flex items-baseline gap-3 border-b border-line py-3 text-[10.5pt] last:border-0">
                    <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-ochre" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(r.nextStep || r.reviewWhen) && (
            <div className="mt-8">
              <Kicker>
                {r.nextStep ? "My next small step" : ""}
                {r.nextStep && r.reviewWhen ? " / " : ""}
                {r.reviewWhen ? `review on ${r.reviewWhen}` : ""}
              </Kicker>
              {r.nextStep && <p className="display mt-3 text-[17pt] leading-snug text-pine">{r.nextStep}</p>}
            </div>
          )}

          {r.legal && <Footnote>My legal route, as I recorded it: {r.legal}</Footnote>}
        </Body>
        {foot(3)}
      </Sheet>
    </>
  );
}
