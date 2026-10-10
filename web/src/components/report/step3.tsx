"use client";
/*
 * My Decision — the result of Step 3, as four sheets of paper.
 *
 * Sheet 1  the decision, the five lights, and the conditions still in the way
 * Sheet 2  the money (shared with the Blueprint)
 * Sheet 3  what could go wrong, and the way back
 * Sheet 4  the order things happen in
 *
 * A decision document that only showed the decision would be the dangerous
 * kind. The conditions, the risks and the way back are on the same paper as
 * the word "go", because that is what makes it a decision rather than a hope.
 */
import { Body, Cover, Footnote, Headline, Kicker, PageFoot, PageSetup, Rule, RunningHead, Sheet, Standfirst } from "./chrome";
import { ConditionRows, Lights, Numbered, Steps } from "./charts";
import { ChangePlanSheet } from "./change-plan";
import { MoneySheet } from "./money-sheet";
import { noStop, openLights, type ChangePlan, type Step3 } from "@/lib/report";
import { coverWords } from "@/lib/report";

export function Step3Doc({
  r,
  plan,
  who,
  when,
  currency,
}: {
  r: Step3;
  /** The staying route, for somebody who is changing their life where they are. */
  plan: ChangePlan;
  who: string;
  when: string;
  currency: string;
}) {
  const of = plan.written ? 5 : 4;
  const open = openLights(r.lights);
  const cover = coverWords(r.decision || "My decision");

  return (
    <>
      <PageSetup />
      {/* ───────────────────────────── one ───────────────────────────── */}
      <Sheet>
        <Cover
          kicker="The Made Real Blueprint / Step 3"
          headline={cover.headline}
          tail={cover.tail}
          quote={r.question || undefined}
          lines={[r.what].filter(Boolean)}
          who={who}
          when={when}
        />
        <Body>
          <div className="pt-10">
            <Kicker>My five lights / as I recorded them</Kicker>
          </div>
          <div className="mt-5">
            <Lights lights={r.lights.map((l) => ({ name: l.name, colour: l.colour, note: l.note }))} />
          </div>
          <Footnote>
            The colours are my own answers on the day, not a certificate that anything is ready.
          </Footnote>

          {open.length > 0 && (
            <div className="mt-8">
              <Kicker>The conditions that still matter</Kicker>
              <div className="mt-4">
                <ConditionRows rows={open.map((l) => ({ name: l.name, note: l.note, when: l.when }))} />
              </div>
            </div>
          )}

          {r.firstStep && (
            <Footnote>
              My first step: {noStop(r.firstStep)}
              {r.firstStepDate ? `, before ${r.firstStepDate}` : ""}.
            </Footnote>
          )}
        </Body>
        <PageFoot who={who} page={1} of={of} />
      </Sheet>

      {/* ───────────────────────────── two ───────────────────────────── */}
      <MoneySheet
        m={r.money}
        cascade={r.cascade}
        runway={r.runway}
        who={who}
        where="Step 3 · Decide"
        page={2}
        of={of}
        currency={currency}
        kicker="02 / Money"
      />

      {/* ──────────────────────────── three ──────────────────────────── */}
      <Sheet>
        <RunningHead where="Step 3 · Decide" />
        <Body>
          <Kicker>Risk and a way back</Kicker>
          <Headline>What I will watch</Headline>
          {r.reasons && <Standfirst>{r.reasons}</Standfirst>}

          {r.risks.length > 0 && (
            <div className="mt-8">
              <Numbered
                items={r.risks.map((x) => ({
                  title: x.title,
                  sign: x.sign ? `Warning sign: ${x.sign}` : undefined,
                  answer: x.answer,
                }))}
              />
              <Footnote>
                My own judgement of what could go wrong. The warning signs are things I will look for, not predictions.
              </Footnote>
            </div>
          )}

          {(r.returnFund || r.keepForPlanB) && (
            <>
              <Rule />
              <Kicker>My way back</Kicker>
              <div className="mt-4 grid grid-cols-[62mm_1fr] gap-x-10">
                <h3 className="display text-[17pt] leading-snug text-pine">
                  Keep a home.
                  <br />
                  Protect a return fund.
                </h3>
                <div className="space-y-3 text-[11pt] leading-relaxed">
                  {r.returnFund && <p className="whitespace-pre-line">{r.returnFund}</p>}
                  {r.keepForPlanB && <p className="whitespace-pre-line text-stone">{r.keepForPlanB}</p>}
                </div>
              </div>
            </>
          )}

          {r.alternative && (
            <div className="mt-8">
              <Kicker>The alternative still on the table</Kicker>
              <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{r.alternative}</p>
            </div>
          )}
        </Body>
        <PageFoot who={who} page={3} of={of} />
      </Sheet>

      {/* ──────────────────────────── four ───────────────────────────── */}
      <Sheet last={!plan.written}>
        <RunningHead where="Step 3 · Decide" />
        <Body>
          <Kicker>From decision to action</Kicker>
          <Headline>The order matters</Headline>
          {r.conditions && <Standfirst>{r.conditions}</Standfirst>}

          {r.steps.length > 0 && (
            <div className="mt-9">
              <Steps
                steps={r.steps.map((s) => ({
                  when: s.when,
                  what: s.what,
                  note: s.note ? `What must be true first: ${s.note}` : undefined,
                }))}
              />
            </div>
          )}

          {r.rentOrBuy && (
            <>
              <Rule />
              <Kicker>A commitment I keep for later</Kicker>
              <p className="display mt-3 text-[18pt] leading-snug text-pine">{r.rentOrBuy}</p>
            </>
          )}

          {(r.reviewWhen || r.wouldChange) && (
            <div className="mt-8">
              <Kicker>{r.reviewWhen ? `Look again / ${r.reviewWhen}` : "When I look again"}</Kicker>
              {r.wouldChange && <p className="mt-3 text-[11pt] leading-relaxed">{r.wouldChange}</p>}
            </div>
          )}

          {r.whoDecided && <Footnote>Decided with: {r.whoDecided}</Footnote>}
        </Body>
        <PageFoot who={who} page={4} of={of} />
      </Sheet>

      {/* ──────────────────────────── five ───────────────────────────── */}
      <ChangePlanSheet plan={plan} who={who} where="Step 3 · Decide" page={5} of={of} last />
    </>
  );
}
