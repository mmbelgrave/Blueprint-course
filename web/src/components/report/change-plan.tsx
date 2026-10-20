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
 * place. So the blocks are packed onto as many sheets as they need, in the
 * order they read: `changePlanLayout` decides, one list of blocks per sheet,
 * and this draws what it is given. A short plan is still one sheet.
 */
import { Body, Footnote, Headline, Kicker, PageFoot, Pull, RunningHead, Rule, Sheet } from "./chrome";
import { Steps } from "./charts";
import { changePlanLayout, inPlaceLine, looksLikeADate, noStop, type ChangePlan, type PlanBlock } from "@/lib/report";

type Props = {
  plan: ChangePlan;
  who: string;
  where: string;
  /** The page number of the first of these sheets. */
  page: number;
  of: number;
  last?: boolean;
};

export function ChangePlanSheet({ plan, who, where, page, of, last = false }: Props) {
  const sheets = changePlanLayout(plan);
  if (sheets.length === 0) return null;

  return (
    <>
      {sheets.map((blocks, i) => (
        <Sheet key={blocks.join("-") || i} last={last && i === sheets.length - 1}>
          <RunningHead where={where} />
          <Body>
            <Kicker>If I am staying</Kicker>
            <Headline>{headline(i, blocks)}</Headline>
            {i === 0 && (
              <>
                {plan.change && <Pull className="mt-5">{plan.change}</Pull>}
                {inPlaceLine(plan.inPlace) && (
                  <p className="mt-3 text-[11pt] text-stone">{inPlaceLine(plan.inPlace)}</p>
                )}
              </>
            )}
            {blocks.map((block) => (
              <PlanPart key={block} block={block} plan={plan} first={blocks[0] === block} />
            ))}
            {i === sheets.length - 1 && (
              <Footnote>
                {plan.checkIns
                  ? `I look at this again${looksLikeADate(plan.checkIns) ? " on" : ":"} ${noStop(plan.checkIns)}. `
                  : ""}
                Staying is a decision like any other, and this is the plan that goes with it.
              </Footnote>
            )}
          </Body>
          <PageFoot who={who} page={page + i} of={of} />
        </Sheet>
      ))}
    </>
  );
}

/** What this sheet is called, which follows what is on it. */
function headline(index: number, blocks: PlanBlock[]): string {
  if (index === 0) return "My change plan";
  if (blocks.includes("steps")) return "The order I will do it in";
  return "What it rests on, and the way back";
}

/** One block of the plan. The order they come in is the order they read in. */
function PlanPart({ block, plan, first }: { block: PlanBlock; plan: ChangePlan; first: boolean }) {
  switch (block) {
    /* Rev.01b: what they hold on to, and the test before the change. */
    case "keep":
      return <Prose label="What I keep" text={plan.keep} gap="mt-6" />;
    case "smallTest":
      return <Prose label="The small test I run first" text={plan.smallTest} gap="mt-6" />;
    case "steps":
      return plan.steps.length > 0 ? (
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
      );
    case "money":
      return (
        <>
          {!first && <Rule />}
          <div className={`grid grid-cols-2 gap-x-10 ${first ? "mt-8" : ""}`}>
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
    case "people":
      return (
        <div className="mt-8 grid grid-cols-2 gap-x-10">
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
      );
    case "uncertain":
      return <Prose label="What is still uncertain" text={plan.uncertain} />;
    case "planB":
      return <Prose label="My Plan B" text={plan.planB} />;
  }
}

function Prose({ label, text, gap = "mt-8" }: { label: string; text: string; gap?: string }) {
  if (!text) return null;
  return (
    <div className={gap}>
      <Kicker>{label}</Kicker>
      <p className="mt-2 whitespace-pre-line text-[11pt] leading-relaxed">{text}</p>
    </div>
  );
}
