# Sample B: the staying route

Printed from the app on 19 October 2026, from Sam's answers in
`../../screenshots/sample-b-answers.mjs`. Sam is invented, like Anna, and
decides to change life where Sam already lives rather than move.

These are page 1 of each document, captured at the sheet's own size
(794 x 1123, which is A4 at 96dpi) for the website cards. For print-quality
pages, follow "How to print them again" in `../README.md` and save each sheet
as PDF instead.

| File | What it is |
| --- | --- |
| step1-working-direction-p1.jpg | After Step 1. The life picture, and what Sam is choosing between. |
| step2-explore-summary-p1.jpg | After Step 2. The place, which here is the town Sam already lives in. |
| step3-decision-p1.jpg | After Step 3. "Go and change where I am", with the five lights. |
| phase1-blueprint-p1.jpg | After Phase 1. Everything on one document. |

The figures tie out across all four: €2,210 guessed in Step 1 against €2,198
found in Step 2, €2,360 of confirmed pay on four days, €150 left over, and
€14,000 of savings becoming €6,710 after the one-time costs and the reserve.

## To make them again

1. `node design/screenshots/sample-b-answers.mjs <somewhere>/sam.json`
2. `cd web && node scripts/preview-mode.cjs`
3. Serve sam.json on port 3099 and set it into `localStorage` under
   `blueprint-preview-v1`, exactly as in `../README.md`.
4. Open `/step/1/print`, `/step/2/print`, `/step/3/print` and `/phase/1/print`.
