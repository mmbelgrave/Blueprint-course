# Project progress

## Current version (2026-09-21)
Prototype with **Step 1 Picture (workbook v9)** and **Step 2 Explore (workbook v2)**,
the AI partner (milestone 3) and its memory (milestone 4). Code in `web/`.
Brief: `build-prompt-v1.md` + naming update in `My Purpose/AI Companion/build-prompt-v2.md`
+ the update sections in `PROJECT.md`.

## Done
- Milestones 1–2: sign-in (magic link), consent, autosave (retry, in order,
  honest "Saved"), row-level security, all field types, money rules
  ("unknown" never counts as zero; 3.4 counts only confirmed/agreed; 3.5 calculation).
- Review round 1 (LLM2, `REVIEW.md`): findings 1–7 fixed, 8 partly, 9 for milestone 5.
- Milestone 3, AI partner: `/api/partner`, claude-opus-5, adaptive thinking,
  effort medium, streaming, `fallbacks: "default"`, cached system prompt, per-page
  chat (window starts empty; "Show earlier conversation"), 80 messages/day.
- Mwata's feedback round 1: A–D letters, summary page numbers (0.2, 1.6 …),
  0.1 "Four questions".
- **2026-09-21 — content:** Step 1 v9 ported (33 changes: Picture naming,
  network, new/rewritten stories, all stories approved, new examples 1.5 and 5.1,
  tips). Step 2 v2 added as `step2-content.json` (21 pages). Both checked
  automatically against the Word text: every sentence present; nothing removed.
- **2026-09-21 — app:** multi-step (`/step/1`, `/step/2`, old links redirect),
  dashboard with both steps, step overview (welcome, where to start, how it
  works, word help, route, sources), new features for Step 2: fixed fact
  tables, "Where to check it yourself", "This is expert work", "Can you skip
  this part?", heading fields, "Copy from Step 1", score columns with own
  names and totals, Step 1 money total next to the Step 2 money check.
  Product naming everywhere. Partner knows both workbooks and the Step 2 rules.
- **2026-09-21 — milestone 4, memory:** `/api/profile` updates "what the partner
  knows" after every page marked done (structured output, effort low, answers
  saved first); `/me` page to see, correct ("kept as you wrote it") and forget
  items; "Update from my answers now"; "Delete everything" (`/api/account/delete`).

- Mwata's feedback round 2 (2026-09-21): dashboard step cards aligned (same
  layout, "Next:" line, Continue/Start + Step overview); partner notes now in the
  interface language (were German by mistake) and each note only from its own
  pages; Mwata's budget test answers (3.2–3.5) emptied and notes rebuilt
  (`scripts/clear-pages.ts`). Service role key + ADMIN_EMAIL now set and working.

- Mwata's decisions (2026-09-21): "your AI partner" everywhere (the workbook's
  "partner" = life partner); "Forget this" is complete: the note is deleted AND
  the answers behind it are hidden from the AI partner (chat and notes update),
  except on the page the person is on (`PROFILE_SOURCES`, `answersWithoutForgotten`).
  Tests 22/22; live `partner-check -- forget` PASS (forgotten fear not mentioned).

- **Settings page** (`/settings`): first name, currency, both consents can be
  changed later (the consent screen promised this). AI partner switched off →
  panel says so, no notes updates, drafts off.
- **Milestone 5, results:**
  - "Help me draft this" (`/api/draft`, `src/lib/drafts.ts`, `src/lib/partner/draft.ts`)
    on every "What does this tell me?" page, on 5.1 (life picture, essentials,
    assumptions only) and on the Explore Summary (the research boxes). Draft only
    from that part's answers (5.1: all of Step 1; Explore Summary: Steps 1–2),
    never from forgotten topics; max 150 words; shown next to each box as
    "Draft — make it yours" with "Use this draft"; stored in part_results.ai_draft.
    Own daily limit (20, `DRAFT_DAILY_LIMIT`).
  - "How did this part feel?" (1–5 stars + comment) once per part (summary page,
    or the last required page of Part 5) → `feedback` table.
  - Printable result page `/step/1/print` (My Working Direction) and
    `/step/2/print` (My Explore Summary) with the closing words; "Save as PDF"
    via the browser print window; app menus hidden when printing.
  - Live check `npm run draft-check`: 5/5 PASS (77 words, own words, empty boxes
    left empty, no Part 2 answers, forgotten topic not used).

- **Review round 2 (2026-09-22):** all findings fixed — see `REVIEW.md`
  "Fixes and rechecks — round 2". Tests 27/27.
- **Milestone 6, admin view (2026-09-22):** `/admin` (only for `ADMIN_EMAIL`,
  checked on the server in every admin request, `src/lib/admin-server.ts`):
  per participant name, email, start date, last activity, progress per part of
  both steps, feedback (stars + comments), AI use (messages, drafts, note
  updates, tokens) and an estimated cost; totals on top. `/admin/<id>`: answers
  in workbook order + AI notes (forgotten notes hidden), read-only, **only** when
  that person ticked "Mwata may read my answers" (server returns 403 otherwise).
  "Admin" link appears only for the admin (the email is never sent to the browser).
  Checks: `scripts/admin-check.ts` on the real database (1 participant, progress
  and usage correct); without sign-in all admin APIs answer 403; admin email not
  in browser files. Chats from before the service key was set are not in the
  usage numbers (they were not logged then).

- **Milestone 7, polish (2026-09-22):**
  - Answer tables and the 3.5 calculation become cards on phones (<640 px):
    each cell shows its column name above it (`.rtable` in `globals.css`,
    `data-label` on cells). No sideways scrolling.
  - Friendly error screen (`app/error.tsx`, "Try again") and "page not found"
    (`app/not-found.tsx`).
  - 4.1 starting text "Change nothing" now counts as an answer for the AI
    partner, the print page and "Copy from Step 1" (a starter ending in ":"
    such as "Stay — but change:" does not). Admin: "No participants yet".
  - **Walk-through (preview copy, made-up answers):** all 59 addresses (every
    page of both steps, overviews, print pages, notes, settings, privacy,
    Freedom idea, a wrong address) at 375 px and 1280 px = 118 page views:
    every page has a title, none wider than the screen, no errors.
    Tables on a phone (2.1, 3.2, Step 2 1.2): header hidden, rows as cards,
    column name above each box ("Today (EUR)", "Country 1: Portugal").
    typecheck, lint, tests 27/27 pass.
  - Not walked through: the signed-in flows (AI partner, notes, drafts, admin)
    — they need Mwata's account; see "Next step".

## Checked (2026-09-21)
- typecheck, lint, `next build` pass; `npm test` 16/16.
- Browser (preview copy, made-up answers): dashboard with both steps; Step 2
  overview with all sections; 0.1 "Copy from Step 1"; 1.2 "Country 1: Portugal"
  and totals "4 · 8 empty"; 3.2 legal table + the two Portugal routes; no console errors.
- Live model (`npm run profile-check`): corrected item kept, forgotten item empty,
  must-haves and places from the answers — 4/4 PASS.
- Live model (`npm run partner-check -- step2`): visa question → no number given,
  official sources + "write down the date", noticed hoped income.
- Browser bundles: no API key, no service-role name, no partner/profile prompts.
- NOT yet checked: the memory and /me page in a signed-in session; "Delete
  everything" for real; RLS between two signed-in users.

## Still open
- Step 1 route table says "Make your first money picture", the heading says
  "Your first money picture" (both kept: table uses its own words now).
- Heading "Start · Your First Picture." has a trailing full stop in v9 (left out).
- Milestone 5 open: a Word export (brief: "if easy") — not built; PDF via the
  browser's print window, not a one-click file download.
- All 7 milestones are built. Not yet tried by Mwata while signed in: notes /
  "Forget this", drafts, feedback, print, admin; RLS between two accounts;
  "Delete everything" with a test account.
- The cost in the admin view is an estimate: cache writes are not in `usage_log`.
- Privacy page is a placeholder; Mwata writes the legal text.
- Git: first commit c50058e on branch main, pushed 2026-09-23 to the private
  repository https://github.com/mmbelgrave/Blueprint-course (98 files). Commits
  use the GitHub no-reply address 329199588+mmbelgrave@users.noreply.github.com,
  so Mwata's real email stays private (GitHub refuses a push that would publish
  it). .env.local is not in the repository; checked: no API keys, no tokens,
  no email address.
- Code folder inside OneDrive: builds can fail on a file lock while the dev
  server runs (seen 2026-09-22); moving `web/` out of OneDrive would avoid it.
- Not online yet: publishing (Vercel), the Supabase URL settings for the real
  address and a domain need Mwata's decision.

## Next step
Mwata: signed-in walk-through with a second (test) account. Then decide: git
checkpoint, review round 3 (milestones 5–7), and putting it online for the pilot.

## Last handoff
Read `build-prompt-v1.md`, `PROJECT.md` (incl. update sections), this file,
`REVIEW.md`, then `web/README.md`. Test screens without sign-in:
`node web/scripts/preview-mode.cjs` → http://localhost:3001.
