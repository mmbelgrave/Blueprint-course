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
  - **2026-09-28 — the printed result redesigned (one layout for every step):**
    Pine result banner (product, edition, result title, step · name · date), the
    first answer in a Sage panel with an ochre bar, labelled answers, then the
    other exercises under their own headings. Table answers now print as real
    tables (heads Sand on Pine, fixed row names on Sage, money columns show the
    currency, empty rows left out) instead of one dash-joined line. Ends with the
    step's closing words and a copyright line (holder in `PRODUCT.copyright_holder`,
    year set by the browser). Print CSS: `print-color-adjust: exact` so the brand
    colours survive, table heads repeat on the next page, rows are not split.
    Checked: typecheck, tests 27/27, production build, both steps on screen and in
    print view (`design/print-step1-result.png`, `print-step2-result.png`).
    Open for Mwata: the copyright holder's name, and the wording of the use line.
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
- Privacy page rewritten for the pilot (what is stored, who reads it, Supabase
  and Anthropic named, how long, deleting, rights). Add a company name and a
  contact address before the Blueprint opens to strangers.
- Git: first commit c50058e on branch main, pushed 2026-09-23 to the private
  repository https://github.com/mmbelgrave/Blueprint-course (98 files). Commits
  use the GitHub no-reply address 329199588+mmbelgrave@users.noreply.github.com,
  so Mwata's real email stays private (GitHub refuses a push that would publish
  it). .env.local is not in the repository; checked: no API keys, no tokens,
  no email address.
- Code folder inside OneDrive: builds can fail on a file lock while the dev
  server runs (seen 2026-09-22); moving `web/` out of OneDrive would avoid it.
- Going online: all app-side work is done (see GO-LIVE.md). Waiting on Mwata:
  the Vercel account and import, the seven settings in Vercel, the Supabase URL
  settings, switching public sign-up off, inviting people, and custom SMTP
  (Supabase's own email sender is a few mails per hour and will drop invitations).

- **2026-09-23 — ready for the pilot:** invite-only sign-in
  (`NEXT_PUBLIC_INVITE_ONLY=true` + `shouldCreateUser: false`; a stranger who
  finds the address gets "not on the list yet" and cannot start an account, so
  cannot spend AI credit), privacy page finished, GO-LIVE.md written (Vercel,
  Supabase URLs, closing sign-up, invitations, SMTP, costs). typecheck, lint,
  tests 27/27, production build: all pass.

## Version 2 (2026-09-28) — new content and the four improvements

**Content.** Step 1 rebuilt from workbook v19 (21 pages: new warm-up 1.0, no 4.3
and 4.4, reworked Part 3, 16-line 5.1 with Rosa's completed example) and Step 2
from workbook v8 (17 pages, same structure, rewritten). Both checked sentence by
sentence against the Word text, in both directions. The Freedom Academy box and
its page are gone: they are not in either workbook any more.

**Brand.** The app was built in indigo, which the brand guide reserves for
SabiFasi. Now Pine #2C3B2F / Sand / Ochre #8F5410, Granite text, Stone captions,
Sage panels, Moss for the third terrace; Newsreader for headings, Hanken Grotesk
for body and UI; tabular figures in every table; the real Terraces mark in the
header and as the favicon (src/app/icon.svg). Ochre is kept for the one thing
that matters on a screen: "you are here", "Watch out", "A friendly challenge".

**Navigation.** The journey motif on the step overview shows the phase (Choose
it, with Build it and Live it in Sage; exactly three lines, one motif per page).
A part rail on every workbook page shows the whole step: a segment per part,
filled as pages are done, with an ochre marker on the part you are in. At the
foot of each page: the pages of that part as chips (tick = done, half = started),
previous and next by page (at the edge of a part the next button names the next
part), and "Step overview" / "Both steps".

**Examples.** Each example now sits next to the box it belongs to, closed, as
"See an example". Nothing is ever written into an answer box. The planned "Use
as a starting point" button for the format pages is NOT built: the workbook's
examples are prose, so inserting one would mean inventing structured content.

**Vision board (1.2 "Go deeper").** Up to eight pictures, each with one line
about the need it represents, matching the workbook's "five to eight photos".
Pictures are shrunk in the browser (long side 1600px, JPEG) and stored in a
private Supabase bucket, one folder per person, shown through one-hour signed
links. Remove one at a time; "Delete everything" removes the whole folder; the
Step 1 print page shows the board three to a row. The AI partner reads only the
lines, never the pictures, and is told so in its instructions.
**Mwata must run `web/supabase/storage.sql` once** before the board works.

**Checked:** typecheck, lint, tests 27/27, production build. All 56 addresses
walked in the preview copy at 1280px and the main ones at 375px: every page
renders, none is wider than the screen, no console errors. Computed styles
confirm Sand ground, Granite text, Newsreader headings, Hanken Grotesk body,
Pine buttons, tabular figures, and no indigo left anywhere.

**Fixed on the way:** the summary page number (Part 1 starts at 1.0, so its
summary is 1.6, not 1.7) and pages that are only there to be read (Step 2 1.1,
2.1, 2.2 have no answer boxes and used to crash).

## Version 3 (4 October 2026) — the issued workbook, and Step 2 closed

Step 1 rebuilt from **The Made Real Blueprint - Step 1 Picture workbook - Issued
(version 21)**, the file Mwata sends to Michael. Same six parts and the same 21
pages; the changes are inside the exercises.

**The new work in 2.1, "Then look at who decides".** Three kinds of time (fixed
by others, must-dos, my choice) in hours now and hours wanted, then the share of
a 112-hour week the person decides themselves, then the must-dos they can drop
and the one block they will take back next month. A second made-up example and a
second story (the renovation year) come with it. **The app does the division the
workbook asks the reader to do**: 37 of 112 hours shows as 33%, which is the
workbook's own example.

**3.5 now closes the loop with time**: fixed costs are paid in hours you do not
choose, so two questions ask how many hours a month pay the fixed costs and how
much of the income depends on a fixed time and place.

Everything else was wording: contractions, tightened sentences, "C Stay, but
change", the two-year line in 5.1 pointing at time and at Step 8, and the
sources page. Checked both ways against the issued text: what remains is only
the front matter and the headings the app has never carried.

**Three things found in the issued file**, all reported to Mwata:
- 2.2's story reads "When I was 21, shortly after, I moved to Thailand": a word
  was lost. Mended here to match the Introduction, which says "shortly after
  graduating".
- 3.4's total row said "Total confirmed/agreed" while the prose still said only
  confirmed income counts. **Mwata decided on 4 October: the check counts
  confirmed plus agreed.** The app does that now (3.4's total, 3.5 line 1, and
  the four sentences that said otherwise). Hoped income has its own total and
  stays out of the check. The same four sentences need changing in the Word
  file, and Step 2's own money page still says "count only the income you have
  evidence for" - to align when Step 2 is finalised.
- The app leaves out the printing instructions and the copyright page on purpose.

**Step 2 is closed** (journey.json, in_app: false, note "opens soon"). Its
content and everyone's answers are untouched: the overview shows it greyed, and
the step page, any page inside it and its print page all show "not open yet".
Setting in_app back to true opens it again, nothing else.

**The AI partner keeps a new note, "Your time, and who decides it"**, from the
two tables in 2.1, the two questions in 3.5 and the Part 2 summary. "Your life
today and in one year" is now the wheel alone.

## Online (3 October 2026)

- **Address: https://app.maderealblueprint.com**, on Vercel, with a certificate.
  The first address, `blueprint-course.vercel.app`, permanently redirects to it
  and keeps the path, so older links still arrive.
- Supabase Site URL and redirect both point at the new address; signing in there
  was tested end to end.
- **Sign-in emails come from `info@maderealblueprint.com`**, name
  "The Life You Choose", through Resend. `maderealblueprint.com` is verified in
  Resend (TXT `resend._domainkey`, CNAMEs `rsend` and `send`, all at Hostnet).
  `info@` and not `noreply@`: a person stuck at the door replies to that email.
- Anyone may start an account themselves. No list to keep, nobody to add by hand.
- Worth knowing: a DNS name asked for before it exists is remembered as "missing"
  for up to an hour. Ask `ns01.hostnet.nl` directly to see the truth.

## Help: asking Mwata a question (3 October 2026)

The website promises short questions by email or WhatsApp between the meetings.
The app had nothing for that, so:

- **`/help`**, reached from **Help** in the menu and from "Ask Mwata" beside the
  AI partner on every exercise page. Coming from a page, the step and the page
  are already filled in, so nobody has to explain where they were.
- A question has a topic (something general, a step, the app itself, meetings,
  payment), the page, the question, and whether the answer should come by email
  or WhatsApp. Name and email come from the account.
- Three ways out, all carrying the same opening line: the form, a WhatsApp link
  (the number from the website), and an email link.
- **Saved first, emailed second** (`questions` table, `/api/question`,
  `src/lib/support.ts`, `src/lib/support-email.ts`). The email can fail; the
  question must not vanish with it. It shows on **Admin** under that person,
  with their progress beside it, and Admin says so plainly when
  `RESEND_API_KEY` is missing and no email is going out.
- The mail comes from `info@maderealblueprint.com` with the person's own
  address as reply-to, so answering is pressing Reply.
- Checked on the live database: a stranger holding the public key can neither
  read nor write a question (row-level security), and the test row was removed.
- The page repeats the line from the website: own experience, not legal, tax or
  financial advice. No founding-member gating yet — everyone who signs in can
  ask, which is right while the first 12 are all founding members.

## Decided, waiting on launch

- **Supabase Pro before the first paying customer** (2 Oct 2026): the free plan
  keeps no backups and pauses after about a week idle. Fine for testing, not for
  people who paid. Mwata upgrades when the course goes on sale.
- Sign-in is a code only. The email must never carry a link again: Supabase
  issues one token per email, so a mail scanner that opens the link burns the
  code with it (see GO-LIVE.md section 6).

## Next step
Mwata: add `RESEND_API_KEY` in Vercel (Resend → API keys) so questions reach
your inbox, then send one question to yourself from the live app. Also on the
live address: the AI partner across a whole part, the vision board
with photos from a phone, and the print page. Two checks only he can do: `/admin`
on someone who has not ticked consent (progress and feedback show, answers do
not), and the copyright holder's name on the printed result. Still to come: the
video addresses for the per-part slots, which say "being recorded" for now.

## Last handoff
Read `build-prompt-v1.md`, `PROJECT.md` (incl. update sections), this file,
`REVIEW.md`, then `web/README.md`. Test screens without sign-in:
`node web/scripts/preview-mode.cjs` → http://localhost:3001.
