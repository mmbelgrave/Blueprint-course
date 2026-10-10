# The four result documents

Printed from the app on 10 October 2026, from Anna's answers in
`../screenshots/example-answers.mjs`. Nothing is drawn by hand: every word and
every figure on these pages came out of the app, and the charts were worked out
from her own tables.

| File | Pages | What it is |
| --- | --- | --- |
| 01 My Working Direction | 3 | The result of Step 1 |
| 02 My Explore Summary | 3 | The result of Step 2 |
| 03 My Decision | 4 | The result of Step 3 |
| 04 My Blueprint Phase 1 | 4 | The three results in one document |

Built from the design proposals of 9 October (`01–04` in Mwata's Downloads).

## Where every element comes from

Everything in the proposals is in the app except the three noted at the end.

### 01 My Working Direction

| On the page | In the app |
| --- | --- |
| Cover line and quote | 5.1 `life_picture` — her first sentence, split over two lines |
| Name and date | the profile, and 5.1 `date` |
| The three dots | which steps have a result page written in (`stepsFinished`) |
| The two options, with the doubt under each | 4.1 `options` — the option and "what I am not sure about" |
| What I want to protect | 1.4 `keep` |
| The word row | 1.4 `values` |
| Today → in one year | 2.1 `wheel`, biggest gap first, only areas she scored |
| Time I decide for myself | 2.1 `decides`, the "My choice" row ÷ 112 waking hours |
| The first block I take back | 2.1 `take_back`; the paragraph beside it is `starting_point.strengths` |
| Monthly costs / income / the gap | 3.2, 3.4 and 3.5, counted by the workbook's own rules |
| One-time cost and what is left | 3.3, and 3.5's savings minus deposits and reserve |
| What my new life must give me | 1.4 `must_haves` |
| Next step, review, dealbreakers | 5.1 `next_step`, `review_when`, `continue_or_stop`, 1.4 `dealbreakers` |

### 02 My Explore Summary

| On the page | In the app |
| --- | --- |
| Cover line, place, date | s2-5.1 `place`, `where`, `date` |
| The times around the house | s2-3.3 `daily` — rows whose answer names a time; green dot = "Known" |
| Scores out of 20 | s2-1.2 `scores` summed per country (or s2-2.3 for regions); the one picked out is the one she chose in `country_choice`, which is **not** the highest total |
| The two quotes | s2-4.3, in her own words |
| What changed | `test_visit.changed` |
| Guess against found | 3.2 `costs` (new life) against s2-3.1 `costs` (found) |
| The month, on confirmed income | 3.4, confirmed only |
| Open before the next decision | s2-5.1 `unknowns` |

### 03 My Decision

| On the page | In the app |
| --- | --- |
| Cover word | s3-4.2 `decision` |
| The five lights | `green_lights.lights`, with what turns each one green |
| The conditions that still matter | the same table, amber and red rows only, with their dates |
| Costs, income, the shortfall | the money thread (lib/blueprint.ts) |
| The savings cascade | s3-1.1 check one, line for line: savings, deciding, move, deposits, reserve, return fund |
| 22 / 18 months | s3-1.1 check two; the runway divides what is **left to live on**, not the savings |
| The three risks | s3-2.2 `risks` — the fear, the early warning sign, what she will do |
| My way back | s3-1.5 `return_fund` and `keep` |
| The order matters | s3-3.1 `steps`, with what must be true first |
| Buying waits | s3-1.4 `rent_or_buy` |

### 04 My Blueprint Phase 1

Everything above, plus:

| On the page | In the app |
| --- | --- |
| The three dates on the dots | 5.1 `date`, s2-5.1 `date`, s3-4.2 `first_step_date` |
| "1 year" | read out of s3-0.1 `what_go_means`; left off when nobody said how long |
| "2 conditions still open" | the count of amber and red lights |
| What I need / what the research found | s3-4.1 `check`, with its own known-or-estimate column |

## The three things the proposals have that the app does not

1. **The editorial headlines** — "Two ways to change our ordinary days", "A
   first picture, with gaps". Nobody writes those sentences in the workbook.
   Each page now has a fixed heading instead, and the **cover** line is the
   person's own first sentence, never one written for them.
2. **Two voices.** The proposals quote Lotte and Ben separately. One account is
   one person today; the partner seat is §6.8 and is not built. Step 2 shows two
   of her own answers from the visit instead.
3. **The beach.** The daily-life check has no "beach" row, so that spoke only
   exists if somebody writes it somewhere the app reads. The other three times
   come straight from the table.

Two smaller ones: the proposals' "countries out of 20" assumes the ten factors
were scored, and the hub assumes travel times were written as times ("40
minutes"). Where either is missing the page leaves that part out rather than
guessing.
