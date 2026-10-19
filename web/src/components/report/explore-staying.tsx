"use client";
/*
 * "My Explore Summary (staying)" — the Step 2 result for somebody checking a
 * change where they live (workbook S7, Rev.01c).
 *
 * The moving document asks about a place: the distances, the country scores,
 * the visit. None of that is this person's work. Theirs is the change itself:
 * what it gives, what it costs, what the rules say, what their week looks
 * like afterwards, who is involved, and what their test showed.
 *
 * It appears only when they have written it, so a mover's document is exactly
 * as it was.
 */
import { Body, Cover, Footnote, Headline, Kicker, PageFoot, Pull, RunningHead, Rule, Sheet } from "./chrome";
import type { ExploreStaying } from "@/lib/report";

export function ExploreStayingSheets({
  plan,
  who,
  when,
  page,
  of,
}: {
  plan: ExploreStaying;
  who: string;
  when: string;
  page: number;
  of: number;
}) {
  if (!plan.written) return null;
  const pair = (left: { k: string; v: string }, right: { k: string; v: string }) => (
    <div className="mt-8 grid grid-cols-2 gap-x-10">
      {[left, right]
        .filter((c) => c.v)
        .map((c) => (
          <div key={c.k}>
            <Kicker>{c.k}</Kicker>
            <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{c.v}</p>
          </div>
        ))}
    </div>
  );

  return (
    <>
      <Sheet>
        <Cover
          kicker="The Made Real Blueprint / Step 2"
          headline={plan.change || "The change I am exploring"}
          quote={plan.gives}
          who={who}
          when={when}
        />
        <Body>
          <Kicker>What I am checking</Kicker>
          <Headline>The change, and what it rests on</Headline>
          {plan.reasons && <Pull className="mt-5">{plan.reasons}</Pull>}
          {pair(
            { k: "What it does not give me", v: plan.notGive },
            { k: "What is still unknown", v: plan.unknowns },
          )}
          <Rule />
          {pair({ k: "Money after the change", v: plan.money }, { k: "My week", v: plan.hours })}
        </Body>
        <PageFoot who={who} page={page} of={of} />
      </Sheet>

      <Sheet last>
        <RunningHead where="Step 2 · Explore" />
        <Body>
          <Kicker>What I found out</Kicker>
          <Headline>The rules, the people, and the test</Headline>
          {pair({ k: "Rules at work or home", v: plan.rules }, { k: "The people involved", v: plan.people })}
          {plan.test && (
            <div className="mt-8">
              <Kicker>What my test showed</Kicker>
              <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{plan.test}</p>
            </div>
          )}
          {plan.choice && (
            <>
              <Rule />
              <Kicker>What I choose now</Kicker>
              <p className="display mt-3 text-[17pt] leading-tight">{plan.choice}</p>
              {plan.nextStep && (
                <p className="mt-3 text-[11pt]">
                  My next small step, within two weeks: {plan.nextStep}
                </p>
              )}
            </>
          )}
          <Footnote>
            {plan.reviewWhen ? `I review what I learned: ${plan.reviewWhen}. ` : ""}
            Step 3 checks this change with the five green lights and ends with the plan that goes with it.
          </Footnote>
        </Body>
        <PageFoot who={who} page={page + 1} of={of} />
      </Sheet>
    </>
  );
}
