# Sample B: the staying route

Printed from the app on 19 October 2026, from Sam's answers in
`../../screenshots/sample-b-answers.mjs`. Sam is invented, like Anna, and
decides to change life where Sam already lives rather than move.

Nothing here is drawn by hand. Every word and every figure came out of the
app, and the figures tie out across all five documents: €2,210 guessed in
Step 1 against €2,198 found in Step 2, €2,360 of confirmed pay on four days,
€150 left over each month, and €14,000 of savings becoming €6,710 after the
one-time costs and the €6,600 reserve.

| File | Pages | What it is |
| --- | --- | --- |
| 01 My Working Direction.pdf | 3 | After Step 1. The life picture, and what Sam is choosing between. |
| 02 My Explore Summary.pdf | 3 | After Step 2. The place, which here is the town Sam already lives in. |
| 03 My Decision.pdf | 6 | After Step 3. "Go and change where I am", the five lights, and the change plan. |
| 04 My Blueprint Phase 1.pdf | 6 | After Phase 1. Everything on one document. |
| 05 My Change Plan.pdf | 2 | The staying plan on its own: the steps, the money, the people and Plan B. |

## The four cards for the website

Page 1 of each, at the sheet's own size (794 x 1123, A4 at 96dpi).

| File | Card |
| --- | --- |
| step1-working-direction-p1.jpg | After Step 1 |
| step2-explore-summary-p1.jpg | After Step 2 |
| step3-decision-p1.jpg | After Step 3 |
| step3-change-plan-p1.jpg | The staying plan, in place of the Blueprint |

`phase1-blueprint-p1.jpg` is the Blueprint cover, kept in case you want it
instead.

## To make them again

1. `node design/screenshots/sample-b-answers.mjs <somewhere>/sam.json`
2. `cd web && node scripts/preview-mode.cjs`
3. `node design/screenshots/print-results.mjs <somewhere>/sam.json <out-dir>`

Step 3 prints Chrome straight to PDF over its own debugging protocol, so
there is nothing to install. The same script reprints Anna's four documents
from `example-answers.mjs`; hers have no change plan, so it writes four files
rather than five.
