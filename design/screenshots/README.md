# Screenshots for the landing page

Taken 8 October 2026 from the real app, running locally in preview mode with
one invented person's answers. Nothing here is drawn or mocked up: every figure
on the Blueprint sheets was worked out by the app from the answers in
`example-answers.mjs`.

## The person

Anna, 44, Netherlands, deciding whether to rent a house with land inland from
Coimbra for a year. Her figures are consistent all the way through: Step 1
guesses €2,245 a month, Step 2 finds €2,360, confirmed income is €1,650, so she
is €595 short with about 29 months of runway. Invented, but it adds up — which
is the point of the screenshots.

The name is deliberately not Mwata's: these are example answers, not his.

## The files

| File | What it shows |
| --- | --- |
| 01 `home-phone` | Where somebody lands: the mark, their name, the free material, the Introduction and the phases with their progress |
| 02 `phase-1-phone` | A phase and its three steps, each with its own progress |
| 03 `step-1-lessons-phone` | A step: the workbook to download, then the six lessons |
| 04 `exercise-teaching-phone` | An exercise page from the top — the method, not a blank box |
| 05 `exercise-writing-phone` | The same page, with her own writing in it |
| 06 `money-check-phone` | The app adding up her own figures: €1,650 in, €2,245 out, €595 short |
| 07 `compare-options-phone` | Her must-haves from Step 1 checked against the four options she wrote in 4.1 — the app carrying her answers forward |
| 08 `the-whole-road-phone` | Three phases, eight steps, and where she is on them |
| 09 `step-result-phone` | The result of a step, ready to save as a PDF |
| 10 `settings-phone` | What the AI partner may read, and what Mwata may read |
| 11 `home-dark-phone` | The same home screen in the dark theme |
| 12–15 `blueprint-*` | The Blueprint: cover, the decision in one page, the money from first guess to checked figure, and what does not line up yet with her own dated timeline |
| 16 `life-wheel-desktop` | The same workbook on a laptop |
| 17 `home-desktop` | Home on a laptop |
| 18 `life-wheel-phone` | A table on a phone, stacked into cards |

## Not here yet

- **The videos.** None are recorded, so every lesson page says "coming soon".
  Worth re-shooting 03 once the first videos are up.
- **The AI partner.** It needs a signed-in account and a live key, which the
  local preview has neither of, so the panel only says so. A screenshot of it
  has to come from the live app.

## Taking them again

```bash
node design/screenshots/example-answers.mjs seed.json
```

Run the app locally with Supabase unset (preview mode), open it, put the file's
contents in `localStorage` under `blueprint-preview-v1`, and reload. Hide the
preview-mode banner and the scrollbars for the shot with a style element:

```js
document.head.insertAdjacentHTML(
  "beforeend",
  "<style>html{scrollbar-width:none}*::-webkit-scrollbar{display:none}.bg-ochre{display:none}</style>",
);
```

Phone shots are 390 × 844. The Blueprint sheets are each one
`section.mx-auto` at 1280 wide.
