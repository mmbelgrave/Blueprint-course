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
import { changePlanSheets, orderLayout } from "@/lib/report";
import { noStop, openLights, whenSuffix, type ChangePlan, type Step3, type Together } from "@/lib/report";
import { coverWords } from "@/lib/report";
import { Agreed, SideBySide } from "./two-voices";

export function Step3Doc({
  r,
  plan,
  two,
  mine = "",
  who,
  when,
  currency,
}: {
  r: Step3;
  /** The staying route, for somebody who is changing their life where they are. */
  plan: ChangePlan;
  /** The other person's answers, when there is one (6.8 slice 3). */
  two?: Together;
  /** This person’s own name, for the blocks that name both. */
  mine?: string;
  who: string;
  when: string;
  currency: string;
}) {
  /*
   * Sheet 4 used to be one sheet whatever was written on it, and ran 94px
   * past A4 for somebody who filled every box and all five steps (review
   * round 7, R7-5). It now takes a second sheet when it needs one, and the
   * numbering follows.
   */
  const order = orderLayout(r);
  const of = 3 + order.length + changePlanSheets(plan);
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
            The colours are my own answers on the day. Nothing here says that anything is ready.
          </Footnote>

          {/*
           * Two people decide separately and then together. Printing only one
           * of them would be the wrong document for a plan two people share,
           * and printing them without the agreed line would leave the reader
           * to guess which one counts.
           */}
          {two?.decisions && two.name && (
            <SideBySide
              what="What each of us decided"
              mine={[two.decisions.mine.what, two.decisions.mine.why].filter(Boolean).join(". ")}
              theirs={[two.decisions.theirs.what, two.decisions.theirs.why].filter(Boolean).join(". ")}
              mineName={mine}
              theirName={two.name}
            />
          )}
          {two?.agreedDecision && <Agreed what="The decision we made together" line={two.agreedDecision} />}

          {open.length > 0 && (
            <div className="mt-8">
              <Kicker>The conditions still open</Kicker>
              <div className="mt-4">
                <ConditionRows rows={open.map((l) => ({ name: l.name, note: l.note, when: l.when }))} />
              </div>
            </div>
          )}

          {r.firstStep && (
            <Footnote>
              My first step: {noStop(r.firstStep)}
              {whenSuffix(r.firstStepDate, "before")}
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

      {/* ──────────────────── four, and five when it is needed ───────────────── */}
      {order.map((blocks, i) => (
        <Sheet key={blocks.join("-") || i} last={!plan.written && i === order.length - 1}>
          <RunningHead where="Step 3 · Decide" />
          <Body>
            <Kicker>From decision to action</Kicker>
            <Headline>{i === 0 ? "The order I will do this in" : "What I come back to"}</Headline>
            {i === 0 && r.conditions && <Standfirst>{r.conditions}</Standfirst>}

            {blocks.includes("steps") && r.steps.length > 0 && (
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

            {blocks.includes("commitment") && r.rentOrBuy && (
              <>
                <Rule />
                <Kicker>A commitment I keep for later</Kicker>
                <p className="display mt-3 text-[18pt] leading-snug text-pine">{r.rentOrBuy}</p>
              </>
            )}

            {blocks.includes("lookAgain") && (r.reviewWhen || r.wouldChange) && (
              <div className="mt-8">
                <Kicker>{r.reviewWhen ? `Look again / ${r.reviewWhen}` : "When I look again"}</Kicker>
                {r.wouldChange && <p className="mt-3 text-[11pt] leading-relaxed">{r.wouldChange}</p>}
              </div>
            )}

            {i === order.length - 1 && r.whoDecided && <Footnote>Decided with: {r.whoDecided}</Footnote>}
          </Body>
          <PageFoot who={who} page={4 + i} of={of} />
        </Sheet>
      ))}

      {/* ──────────────────── the staying plan, when there is one ───────────── */}
      <ChangePlanSheet
        plan={plan}
        who={who}
        where="Step 3 · Decide"
        page={4 + order.length}
        of={of}
        last
      />
    </>
  );
}
