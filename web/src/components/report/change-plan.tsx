"use client";
/*
 * "My Change Plan" — the sheet for somebody whose decision is to stay and
 * change their life where they are (the staying route, s3-p5).
 *
 * It appears only when they have written it. The step's result is still My
 * Decision, because that is the question Step 3 asks; this is what they
 * decided to do about it. For the person who stays it is the most important
 * page in the document, and leaving it out would hand them the result of a
 * decision they did not make.
 *
 * A full plan does not fit on one A4 sheet, and printing one that spills
 * leaves a ragged page with no running head and the footer in the wrong
 * place. So a long plan is two sheets: the steps on the first, the money,
 * the people and Plan B on the second. Where it fits, it stays one.
 */
import { Body, Footnote, Headline, Kicker, PageFoot, Pull, RunningHead, Rule, Sheet } from "./chrome";
import { Steps } from "./charts";
import { changePlanSheets, inPlaceLine, looksLikeADate, noStop, type ChangePlan } from "@/lib/report";

type Props = {
  plan: ChangePlan;
  who: string;
  where: string;
  page: number;
  of: number;
  last?: boolean;
};

export function ChangePlanSheet({ plan, who, where, page, of, last = false }: Props) {
  if (!plan.written) return null;
  const split = changePlanSheets(plan) === 2;
  return (
    <>
      <Sheet last={last && !split}>
        <RunningHead where={where} />
        <Body>
          <Kicker>If I am staying</Kicker>
          <Headline>My change plan</Headline>
          {plan.change && <Pull className="mt-5">{plan.change}</Pull>}
          {inPlaceLine(plan.inPlace) && (
            <p className="mt-3 text-[11pt] text-stone">{inPlaceLine(plan.inPlace)}</p>
          )}
          {/* Rev.01b: what they hold on to, and the test before the change. */}
          {plan.keep && (
            <div className="mt-6">
              <Kicker>What I keep</Kicker>
              <p className="mt-2 whitespace-pre-line text-[11pt] leading-relaxed">{plan.keep}</p>
            </div>
          )}
          {plan.smallTest && (
            <div className="mt-6">
              <Kicker>The small test I run first</Kicker>
              <p className="mt-2 whitespace-pre-line text-[11pt] leading-relaxed">{plan.smallTest}</p>
            </div>
          )}

          {plan.steps.length > 0 ? (
            <div className="mt-8">
              <Steps
                steps={plan.steps.map((s) => ({
                  when: s.when,
                  what: s.what,
                  note: s.note ? `What must be true first: ${s.note}` : undefined,
                }))}
              />
            </div>
          ) : (
            plan.firstThree.length > 0 && (
              <div className="mt-8">
                <Kicker>My first three steps</Kicker>
                <ol className="mt-4">
                  {plan.firstThree.slice(0, 4).map((s, i) => (
                    <li key={s} className="grid grid-cols-[14mm_1fr] border-b border-line py-3 last:border-0">
                      <span className="display text-[15pt] leading-none text-ochre">{i + 1}</span>
                      <span className="text-[11pt]">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )
          )}

          <MoneyRow plan={plan} />
          {!split && <PeopleAndPlanB plan={plan} />}
        </Body>
        <PageFoot who={who} page={page} of={of} />
      </Sheet>

      {split && (
        <Sheet last={last}>
          <RunningHead where={where} />
          <Body>
            <Kicker>If I am staying</Kicker>
            <Headline>Who it rests on, and the way back</Headline>
            <PeopleAndPlanB plan={plan} first />
          </Body>
          <PageFoot who={who} page={page + 1} of={of} />
        </Sheet>
      )}
    </>
  );
}

/** The money and the hours, which belong beside the steps. */
function MoneyRow({ plan }: { plan: ChangePlan }) {
  if (!plan.incomeBuffer && !plan.hours) return null;
  return (
    <>
      <Rule />
      <div className="grid grid-cols-2 gap-x-10">
        {plan.incomeBuffer && (
          <div>
            <Kicker>Money and buffer</Kicker>
            <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{plan.incomeBuffer}</p>
          </div>
        )}
        {plan.hours && (
          <div>
            <Kicker>Hours I decide, before and after</Kicker>
            <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{plan.hours}</p>
          </div>
        )}
      </div>
    </>
  );
}

/** Who is in it, the first 90 days, Plan B and the check-in. */
function PeopleAndPlanB({ plan, first = false }: { plan: ChangePlan; first?: boolean }) {
  return (
    <>
      {(plan.whoITell || plan.first90) && (
        <div className={`grid grid-cols-2 gap-x-10 ${first ? "mt-6" : "mt-8"}`}>
          {plan.whoITell && (
            <div>
              <Kicker>Who I tell</Kicker>
              <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{plan.whoITell}</p>
            </div>
          )}
          {plan.first90 && (
            <div>
              <Kicker>My first 90 days</Kicker>
              <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{plan.first90}</p>
            </div>
          )}
        </div>
      )}

      {plan.uncertain && (
        <div className="mt-8">
          <Kicker>What is still uncertain</Kicker>
          <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{plan.uncertain}</p>
        </div>
      )}

      {plan.planB && (
        <div className="mt-8">
          <Kicker>My Plan B</Kicker>
          <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{plan.planB}</p>
        </div>
      )}

      <Footnote>
        {plan.checkIns
          ? `I look at this again${looksLikeADate(plan.checkIns) ? " on" : ":"} ${noStop(plan.checkIns)}. `
          : ""}
        Staying is a decision like any other, and this is the plan that goes with it.
      </Footnote>
    </>
  );
}
