# The Blueprint — Step 1 "Dream" app (prototype v1)

Product Manager brief. Source of truth for features: `build-prompt-v1.md`.
Source of truth for all content: `step1-content.json` (never edit texts without Mwata's OK).

## What I want to make
A web app version of the Step 1 "Dream" workbook (5 parts, 20 exercises) with an
AI partner next to every exercise that helps people think — never writes for them.

## Who it helps
- **Participants** (first Mwata, then 2–3 pilot testers): work through Step 1 at
  their own pace, often in English as a second language.
- **Mwata (admin)**: sees progress and feedback; sees answers only with consent.

## First version (build order)
| # | Milestone | Needs accounts? |
|---|-----------|-----------------|
| 1 | Skeleton: welcome, magic-link sign-in, consent, dashboard | Supabase |
| 2 | Workbook: all field types, autosave, progress, mark done (no AI) | Supabase |
| 3 | AI partner: chat per exercise, 4 helper buttons, streaming, caching | + Anthropic |
| 4 | Memory: profile update, "What my partner knows", delete functions | + Anthropic |
| 5 | Results: part summaries, feedback, Direction page + PDF | + Anthropic |
| 6 | Admin view + usage log | — |
| 7 | Polish + full walk-through | — |

Milestones 1–2 also run in a **local preview mode** (no accounts, data stays in
this browser only) so the workbook can be tried before accounts exist.

## How I will know it works (acceptance checks)
1. I can sign up with an email link, give consent, and complete all 20 exercises.
2. Answers autosave and are still there after closing the browser.
3. The partner answers in my language, short and simple, one question at a time,
   and refuses to write my answers for me.
4. In a new session the partner still knows my earlier answers.
5. The partner declines legal/tax/visa/medical/investment advice and names the right expert.
6. I can view, correct and delete what the partner knows, and delete everything.
7. I can create/edit each part result and download my Direction page as PDF.
8. Admin sees progress + feedback; answers only when the participant consented.
9. API keys never reach the browser; users never see each other's data (RLS).

## Update for workbook v6 (2026-09-18) — replaces parts of brief 4.2, 4.5, 4.6
- **Start (optional): Your First Picture.** 4 questions + a short summary. Shown
  first on the dashboard, but never required; "Continue" skips optional items.
- **Part results (4.5):** each part (not Part 5) ends with its own summary page
  "What does this tell me?" with fixed boxes from the content. The person writes
  it. The AI partner may offer a draft *from their own answers*, marked
  "Draft — make it yours" (milestone 5). Feedback question stays at the end of each part.
- **Working Direction (4.6):** Part 5 is "My Working Direction" (5.1) with four
  good answers (investigate / compare / improve current life first / not ready),
  not yes / not yet / no. Optional 5.2 "The people involved". The printable page
  and PDF export use these fields (milestone 5).
- **Money (Part 3):** amounts can be "unknown"; totals then say "not complete yet"
  (never zero). 3.4 counts only confirmed or agreed income. 3.5 is a worked check
  (example column + my numbers) that the app calculates.
- **Optional exercises** (2.5, 3.1, 5.2) do not block finishing a part.
- **About the Freedom idea** appendix is shown as content (link still to be added).
  The AI partner still never brings it up itself (principle 7).

Extra acceptance checks:
10. 3.5 shows my totals from 3.2–3.4 and calculates lines 3, 8 and 9; with an
    unknown amount it says "not complete yet".
11. 4.2 lists my must-haves from 1.4 and the option names from 4.1.

## Update 2026-09-21 — Step 1 workbook v9, Step 2, naming (brief v2)
- **Naming (build-prompt-v2.md):** product "The Made Real Blueprint — Portugal
  Edition", brand "The Life You Choose", Step 1 = **Picture**, "network" not
  "community", "This Blueprint" in body copy.
- **Step 1 = workbook v9** (`step1-content.json`; v6 kept as `step1-content.v6-backup.json`).
- **Step 2 Explore = workbook v2** (`step2-content.json`), in scope from now on
  (was "later" in brief 3). Page IDs start with `s2-`. Start page copies lines from
  the Step 1 Working Direction (the person decides). The partner may point to the
  official sources in the workbook but never states rules, prices or visa
  conditions as fact.
- Addresses: `/step/1`, `/step/2` (overview) and `/step/<n>/<part>/<page>`; old
  `/part/...` links redirect to Step 1.

Extra acceptance checks:
12. Step 2: country/region score tables show my own names ("Country 1: Portugal")
    and totals with the number of empty boxes.
13. Step 2 start page offers my Step 1 answers to copy in; nothing is copied without a click.
14. After I mark a page as done, "What my partner knows" updates from my answers only;
    a corrected item stays as I wrote it; a forgotten item stays empty.

## Later ideas (deliberately out of v1)
Steps 2–8, modules, payments, community, Whop login (auth kept behind one module
so it can be swapped), mobile apps, voice, notification emails.

## Practical limits
- Pilot of ~4 users. Keep hosting on free tiers where possible.
- Ask Mwata before: anything that costs money, domain/publishing, content text
  changes, legal texts (privacy/terms are placeholders).
- Supabase database in an EU region.
