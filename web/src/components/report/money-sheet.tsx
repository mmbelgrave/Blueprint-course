"use client";
/*
 * "What the numbers can carry" — the money page.
 *
 * The same sheet appears in My Decision and in the Blueprint, because it is
 * the same argument in both: this is the month, this is what the savings come
 * to once the move is paid for, and this is how long that lasts. Written once
 * so the two documents can never drift apart and show a person two different
 * runways.
 *
 * Nothing on this page is a forecast. Every figure is one the person wrote or
 * a subtraction of two of them, and where the workbook's own totals are not
 * finished the page says so rather than rounding the doubt away.
 */
import { Body, Footnote, Headline, Kicker, PageFoot, RunningHead, Sheet } from "./chrome";
import { AmountBars, BigNumbers, Waterfall, money } from "./charts";
import type { Cascade } from "@/lib/report";
import type { MoneyThread } from "@/lib/blueprint";

export function MoneySheet({
  m,
  cascade,
  runway,
  who,
  where,
  page,
  of,
  currency,
  kicker,
}: {
  m: MoneyThread;
  cascade: Cascade | null;
  runway: { months: number | null; stress: string; wanted: string };
  who: string;
  where: string;
  page: number;
  of: number;
  currency: string;
  kicker: string;
}) {
  const costs = m.found ?? m.guessed;
  const short = m.balance !== null && m.balance < 0 ? -m.balance : null;

  return (
    <Sheet>
      <RunningHead where={where} />
      <Body>
        <Kicker>{kicker}</Kicker>
        <Headline>What the numbers can carry</Headline>

        <div className="mt-8 grid grid-cols-[1fr_52mm] items-start gap-x-10">
          <AmountBars
            currency={currency}
            rows={[
              { label: `Monthly costs${m.complete ? "" : " · still has unknowns"}`, amount: costs, tone: "pine" },
              { label: "Income I can count on", amount: m.income, tone: "moss" },
            ]}
          />
          {m.balance !== null && (
            <div>
              <p className={`display text-[30pt] leading-none ${short ? "text-ochre" : "text-moss"}`}>
                {money(Math.abs(m.balance), currency)}
              </p>
              <p className="mt-3 text-[10.5pt] font-semibold">{short ? "short each month" : "left over each month"}</p>
              <p className="mt-1 text-[9.5pt] text-stone">On the income I can count on today.</p>
            </div>
          )}
        </div>

        {m.guessed !== null && m.found !== null && m.differencePercent !== null && (
          <p className="mt-7 text-[11pt] leading-relaxed">
            Step 1 guessed {money(m.guessed, currency)} a month. Step 2 found {money(m.found, currency)} —{" "}
            {m.differencePercent === 0
              ? "the same figure"
              : `${Math.abs(m.differencePercent)}% ${m.differencePercent > 0 ? "more" : "less"}`}
            .{m.overTwentyPercent ? " That is over the 20% the workbook asks me to go back and check." : ""}
          </p>
        )}

        {cascade && (
          <div className="mt-9">
            <Kicker>
              How {money(cascade.steps[0].amount, currency)} becomes{" "}
              {money(Math.max(0, cascade.left ?? 0), currency)} to live on
            </Kicker>
            <div className="mt-6">
              <Waterfall steps={cascade.steps} currency={currency} />
            </div>
          </div>
        )}

        {(runway.months !== null || runway.wanted || runway.stress) && (
          <div className="mt-9">
            <BigNumbers
              items={[
                ...(runway.months !== null
                  ? [
                      {
                        value: String(runway.months),
                        caption: short ? `months at ${money(short, currency)} short` : "months of runway",
                        tone: "pine" as const,
                      },
                    ]
                  : []),
                ...(runway.wanted
                  ? [{ value: runway.wanted.replace(/[^0-9.]/g, "") || runway.wanted, caption: "months I want", tone: "ochre" as const }]
                  : []),
              ]}
            />
            {runway.stress && <p className="mt-6 text-[11pt] leading-relaxed">If everything costs 30% more: {runway.stress}</p>}
          </div>
        )}

        <Footnote>
          {cascade
            ? `My runway divides the money left to live on (${money(Math.max(0, cascade.left ?? 0), currency)}), not my savings: the reserve and the return fund are kept out of it on purpose. `
            : ""}
          {m.complete ? "" : "Some costs behind these totals are still marked unknown, so the month is not finished yet. "}
          Nothing here is advice; these are my own figures.
        </Footnote>
      </Body>
      <PageFoot who={who} page={page} of={of} />
    </Sheet>
  );
}
