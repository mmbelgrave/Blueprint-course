"use client";
/*
 * My Blueprint · Phase 1 — the three step results pulled into one document.
 *
 * Sheet 1  where the three steps got to, and what I am choosing now
 * Sheet 2  what I am keeping hold of, and what the research said about it
 * Sheet 3  the money (the same sheet as My Decision)
 * Sheet 4  what is still open, the first action, and the way back
 *
 * This is the document that leaves the app: it gets shown to a partner, a
 * parent, sometimes a landlord or an adviser. So it is written to be read by
 * somebody who was not there — every figure says how sure it is, and nothing
 * on it is advice.
 */
import { Body, Cover, Footnote, Headline, Kicker, PageFoot, PageSetup, Pull, Rule, RunningHead, Sheet, Standfirst } from "./chrome";
import { BigNumbers, ConditionRows, Lights, NeedRows, PhaseDots, ShareBars } from "./charts";
import { ChangePlanSheet } from "./change-plan";
import { MoneySheet } from "./money-sheet";
import { durationIn, firstClause, noStop, openLights, WAKING_HOURS, type Blueprint, type ChangePlan } from "@/lib/report";

export function BlueprintDoc({
  r,
  plan,
  who,
  when,
  currency,
  phaseName,
}: {
  r: Blueprint;
  /** The staying route, for somebody who is changing their life where they are. */
  plan: ChangePlan;
  who: string;
  when: string;
  currency: string;
  phaseName: string;
}) {
  const of = plan.written ? 5 : 4;
  const open = openLights(r.lights);
  const where = phaseName;
  // Only when they said how long: nothing on this cover is a figure we chose.
  const howLong = durationIn(r.what || r.decision);

  return (
    <>
      <PageSetup />
      {/* ───────────────────────────── one ───────────────────────────── */}
      <Sheet>
        <Cover
          kicker="The Made Real Blueprint / Phase 1"
          headline={r.cover.headline}
          tail={r.cover.tail}
          quote={r.cover.quote}
          who={who}
          when={when}
        />
        <Body>
          <div className="py-7">
            <PhaseDots
              steps={[
                { label: "Picture", note: r.dates.one, state: "done" },
                { label: "Explore", note: r.dates.two, state: "done" },
                { label: "Decide", note: r.dates.three, state: "here" },
              ]}
            />
          </div>

          <Kicker>What I am choosing now</Kicker>
          <Headline>
            {firstClause(r.place, 56)}
            {r.decision ? `. ${noStop(r.decision)}.` : "."}
          </Headline>
          {r.conditions && <Standfirst>{r.conditions}</Standfirst>}

          <div className="mt-10">
            <BigNumbers
              items={[
                ...(howLong ? [{ value: howLong, caption: "to test an ordinary life", tone: "pine" as const }] : []),
                { value: String(open.length), caption: open.length === 1 ? "condition still open" : "conditions still open", tone: "ochre" as const },
                ...(r.firstStepDate
                  ? [{ value: shortDate(r.firstStepDate), caption: "first action", tone: "pine" as const }]
                  : []),
              ]}
            />
          </div>

          <Footnote>
            My own answers across the three steps of Phase 1, gathered on one document. It shows what I think today,
            with the open work visible. It is not advice, and it is not a recommendation to move.
          </Footnote>
        </Body>
        <PageFoot who={who} page={1} of={of} />
      </Sheet>

      {/* ───────────────────────────── two ───────────────────────────── */}
      <Sheet>
        <RunningHead where={where} />
        <Body>
          <Kicker>What I am choosing</Kicker>
          <Headline>Keep the life in the plan</Headline>
          {r.values.length > 0 && (
            <Standfirst>
              {r.values.join(", ")}. The move only matters if ordinary days make more room for these.
            </Standfirst>
          )}

          {(r.time.now !== null || r.time.want !== null) && (
            <div className="mt-9">
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
                  ? `${r.time.nowHours} of my ${WAKING_HOURS} waking hours a week are mine to choose today. `
                  : ""}
                The second figure is what I am aiming at.
              </Footnote>
            </div>
          )}

          {r.needs.length > 0 && (
            <div className="mt-7">
              <Kicker>What I need / what the research found</Kicker>
              <div className="mt-4">
                <NeedRows rows={r.needs} />
              </div>
            </div>
          )}

          {(r.protect || r.accept) && (
            <div className="mt-7 border-t border-line pt-6">
              <Kicker>What I protect / what I accept</Kicker>
              <div className="mt-3 space-y-3 text-[11pt] leading-relaxed">
                {r.protect && <p className="whitespace-pre-line">{r.protect}</p>}
                {r.accept && <p className="whitespace-pre-line text-stone">{r.accept}</p>}
              </div>
            </div>
          )}

          {r.twoYears && <Pull className="mt-7">{r.twoYears}</Pull>}
        </Body>
        <PageFoot who={who} page={2} of={of} />
      </Sheet>

      {/* ──────────────────────────── three ──────────────────────────── */}
      <MoneySheet
        m={r.money}
        cascade={r.cascade}
        runway={r.runway}
        who={who}
        where={where}
        page={3}
        of={of}
        currency={currency}
        kicker="03 / Money"
      />

      {/* ──────────────────────────── four ───────────────────────────── */}
      <Sheet last={!plan.written}>
        <RunningHead where={where} />
        <Body>
          <Kicker>My next chapter</Kicker>
          <Headline>Prepare, check, then commit</Headline>

          <div className="mt-7">
            <Lights lights={r.lights.map((l) => ({ name: l.name, colour: l.colour, note: l.note }))} />
          </div>
          <Footnote>The colours are my own answers on the day, not a certificate that anything is ready.</Footnote>

          {open.length > 0 && (
            <div className="mt-8">
              <Kicker>Open conditions</Kicker>
              <div className="mt-4">
                <ConditionRows rows={open.map((l) => ({ name: l.name, note: l.note, when: l.when }))} />
              </div>
            </div>
          )}

          {r.firstStep && (
            <>
              <Rule />
              <Kicker>My first action</Kicker>
              <div className="mt-3 grid grid-cols-[72mm_1fr] gap-x-10">
                <h3 className="display text-[18pt] leading-snug text-pine">
                  {r.firstStep}
                  {r.firstStepDate ? `, before ${r.firstStepDate}.` : ""}
                </h3>
                {r.wouldChange && <p className="text-[11pt] leading-relaxed">{r.wouldChange}</p>}
              </div>
            </>
          )}

          {r.returnFund && (
            <div className="mt-8">
              <Kicker>My way back</Kicker>
              <p className="mt-3 whitespace-pre-line text-[11pt] leading-relaxed">{r.returnFund}</p>
            </div>
          )}

          <Footnote>
            {r.reviewWhen ? `I look at this decision again on ${r.reviewWhen}. ` : ""}
            {r.dealbreakers ? `Dealbreakers I carry forward: ${r.dealbreakers}` : ""}
          </Footnote>
        </Body>
        <PageFoot who={who} page={4} of={of} />
      </Sheet>

      {/* ──────────────────────────── five ───────────────────────────── */}
      <ChangePlanSheet plan={plan} who={who} where={where} page={5} of={of} last />
    </>
  );
}


/** A date as a figure on the cover: "4 May 2027" reads as "4 May". */
function shortDate(value: string) {
  const m = /^(\d{1,2}\s+[A-Za-z]+)\s+\d{4}$/.exec(value.trim());
  return m ? m[1] : value;
}
