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
  stays out of the check. The same four sentences, and the new line under the
  Confirmed/Agreed/Hoped table about when agreed income starts, need changing in
  the Word file, and Step 2's own money page still says "count only the income you have
  evidence for" - to align when Step 2 is finalised.
- The app leaves out the printing instructions and the copyright page on purpose.

**Step 2 is closed** (journey.json, in_app: false, note "opens soon"). Its
content and everyone's answers are untouched: the overview shows it greyed, and
the step page, any page inside it and its print page all show "not open yet".
Setting in_app back to true opens it again, nothing else.

**The AI partner keeps a new note, "Your time, and who decides it"**, from the
two tables in 2.1, the two questions in 3.5 and the Part 2 summary. "Your life
today and in one year" is now the wheel alone.

## The words move to the server (8 October 2026)

Review round 4, finding 1: the whole workbook was compiled into the browser
bundle, so anyone could fetch the JavaScript without an account and read Step 1
and Step 2 end to end. The words are the product, so this was the serious one.

**What the browser keeps now** is the spine: which steps, parts and pages exist,
in what order, their titles, and the shape of each field. Built by
`content-build/make-spine.mjs` into `web/src/content/spine/`. Step 1 drops from
78 KB to 10 KB, Step 2 from 53 to 7, Step 3 from 48 to 6. Navigation, the page
counter, Modules and the progress bars all run on that, and none of it is worth
anything to someone who has not bought the course.

**The words come from `/api/content`**, which asks the same access layer the
screen asks, so a refusal on the server and a refusal on the screen can never
disagree. `lib/content-server.ts` imports `server-only`: a client component that
imports it fails the build, so the rule is kept by the compiler rather than by
anyone remembering it.

**Checked as a stranger** on the branch preview: `?page=1.1`, `?page=1.2`,
`?step=1&full=1` and `?step=3&full=1` all answer 401, and all thirteen public
chunks grep clean for sentences out of both workbooks.

**Nothing visible changed** — no layout, no wording, no saved answer. Page ids
are untouched, so every answer already written reads back where it was. The one
honest cost: on a poor connection a page can show "One moment…" while its words
arrive.

### What the screenshots found

Taking the landing-page screenshots walked the app with a full set of answers
for the first time since the split, and turned up three things the compiler
could not see:

- **The money check printed a dash on every line.** The pages a sum adds up were
  being looked up in the browser's own copy, which is now the spine: a table
  there has no row labels and no record of which column the "known / estimate /
  unknown" mark belongs to. So 3.5, the 2.1 share of the week, the option names
  in 4.2 and both written cost hints silently stopped working. Nothing threw;
  the page just stopped telling anyone the truth. `/api/content` now sends the
  handful of fields a page reads (`sourceFieldsFor`), gated per step, and
  `field-extras.ts` may not look anywhere else — pinned by
  `tests/content-refs.test.ts`, including a test that fails if that import ever
  comes back.
- **The Blueprint's timeline was not in order**, although the page says "your own
  dates, in order". `whenKey` reads a date somebody typed themselves ("4 May
  2027", "Done, 4 March 2027", "Mid-December 2027") and sorts on it; anything
  unreadable keeps its place at the end rather than being guessed at.
- **The mark on the Blueprint cover was invisible** — Pine lines on the Pine
  cover, because the theme tokens only flip for the dark *theme*, not for a dark
  panel inside a light page. `Mark` takes `onDark`, following the brand guide:
  Sand lines, Ochre Light dot.

Also: "34.7 months" of runway now reads "about 34 months". The workbook rounds
down and says "about", and a tenth of a month was never a real figure.

### Screenshots for the landing page

`design/screenshots/`, with a README. Eighteen shots of the real app at phone
and laptop width, filled with one invented person's answers
(`example-answers.mjs`) whose figures add up all the way through to the
Blueprint. Not yet shot, because they do not exist yet: a lesson page with a
real video, and the AI partner, which needs a signed-in account.

### Buying switched on, and the split released (8 October 2026)

`NEXT_PUBLIC_REQUIRE_PURCHASE` had been set for Preview only, so the branch
behaved and the live app let every signed-in person into everything. Phase 1
was granted to Mwata and to Michael first, then the setting went on for
Production and the app was redeployed. The split went to main in the same hour,
because a locked front door with the text on the doorstep is worse than
neither.

Checked on the live app, signed in as an account that owns nothing: 1.2 opens
and draws its words over the network, 1.1, 2.1, 3.5, 5.1 and s2-0.1 are all
refused, both workbooks are refused, `?step=abc` is a 400, and `?step=1&full=1`
answers 14 KB holding one page instead of 78 KB holding twenty-three. Every
sentence probe that used to come back out of the public JavaScript now comes
back empty; the page titles stay, as make-spine says they should. Mwata
confirmed Step 1 is still his.

What a free account can still read, deliberately: the step's own framing
(tagline, intro, how it works, word help) and Part 1's promise and tips, plus
the credits. That is the "see what is inside" material, and only to someone
signed in — a stranger gets 401. Narrowing it is a change to `freePagesOf` if
it ever matters.

## Mwata's review of 9 October (9 October 2026)

Sixteen notes with screenshots, in `design/review-09-oct/`. What changed:

- **The app opens on Modules.** Sign-in, the magic link, the end of
  onboarding and "Continue" on the front page all landed on the exercises
  overview, which is the whole eight-step road rather than the course.
- **A step's result has a home.** Until now the only way to reach My Working
  Direction was a link on the last page of the last part. There is now a card
  under the workbook on the step page, with Open and Download, and the same
  for My Blueprint on the phase page. Both wait: a document made of answers
  nobody has written is an empty page with a proud heading on it. The test is
  the one the Blueprint already used — the result page has been written in —
  not pages ticked as done.
- **Download hands over a .txt** (`lib/written-text.ts`), for the result, the
  Blueprint and Everything I wrote. The JSON export stays in Settings: that
  one is the machine-readable copy the privacy page promises, this one is for
  reading. A table now takes one line per row instead of running on with "|".
- **The five feedback stars had no colour.** `stroke-muted` is not a colour
  this app has, so Tailwind wrote nothing and an unfilled star had no stroke:
  five invisible buttons. Mwata read it as "a lot of space between the two
  sentences", which is exactly what it looked like.
- **The privacy line is on every page** (the `quiet` prop is gone), with room
  above it. A free account still has none, and one quiet link in Settings.
- **The menu stops where the writing stops** on a wide page, instead of
  running to the window edge past the column anybody is reading.
- **Help** lost the second email box (the form already has a general topic)
  and the Meetings topic (meetings are sold outside the course area), and its
  first line now says what to do rather than what the AI partner does.
- Smaller: the free Ordinary Tuesday opens or downloads like every other
  workbook; "Mark as completed" is hidden until there is a video to have
  watched; the pages of a part are centred; every button row is centred on a
  computer too; the way back out sits under the page, not above it.

Not changed: the "Bought it, but cannot get in?" card. Signing in is by
email code and has nothing to do with the shop, so somebody can perfectly
well pay with one address and sign in with another — that card is how they
move the purchase across, and it is the only self-service route that does not
mean writing to Mwata.

## My Blueprint, built (8 October 2026)

Spec 6.5, at /phase/1/print, linked from the phase page. Eight sheets: the
cover, the decision in one page, the money thread, what does not line up yet
and what happens next, the three step results, and the closing line. Saved as
a PDF through the browser's print window, like the step results.

**The rules live in lib/blueprint.ts, with nothing imported but the money
arithmetic, so they are tested on their own** (13 tests). Every line of the
document is the person's own words, their own numbers, or a comparison between
two answers they wrote weeks apart. Nothing is written by an AI and nothing is
advice -- this document leaves the app and gets shown to partners and
advisers, so it may never say anything that could be wrong.

What the rules notice:

- the money thread: what Step 1 guessed, what Step 2 found, the difference as
  a percentage, income against the checked figure, and the runway in months;
- over 20% apart, which is the workbook's own threshold for going back through
  both sets of figures;
- a red light, and an amber light with no date when the others have one;
- a must-have or dealbreaker the last check says this option does not meet --
  and, when none is broken, that fact as the good news it is;
- an unknown carried through from Step 2;
- a "go" with no conditions written down;
- what happens next: their own dates, gathered from the first step, the
  lights, the timeline, the Step 2 next step and the review date.

**It degrades.** A step that is not finished shows "Not finished yet" with a
link rather than an empty page, an empty blueprint flags nothing at all, and
no figure is shown that cannot be worked out from what they wrote.

The proposal it was built from is design/phase-blueprint-proposal-v2.html, and
design/My-Blueprint-Phase-1-example.pdf is the printed worked example.

## Step 3 Decide, built and closed (8 October 2026)

From "The Made Real Blueprint - Step 3 Decide workbook - Rev.00a.docx". Twelve
pages: the Start (the decision question), five green lights (money, papers,
people, place, Plan B), two futures and the risks, the first timeline, and
My Decision with go / not yet / no, plus the optional "not yet or no" page.

Same pipeline as Steps 1 and 2: content-build/s3-*.json -> assemble-step3.mjs
-> step3-content.json -> sync-content.mjs. The two-way check against the Word
text leaves 12 workbook lines and 8 app lines, all of them headings, box
labels, the "workbook -> step" wording, or the made-up example's name --
nothing of substance missing either way.

**It stays closed.** journey.json keeps in_app false while Mwata does his final
quality check, and there is no Step 3 workbook PDF yet. Nothing is visible to
anyone.

## The Blueprint proposal (8 October 2026)

design/phase-blueprint-proposal.html and -v2.html: the five, then eight, A4
sheets of "My Blueprint - Phase 1 - Choose it". Decided with Mwata: the added
value comes from **rules over the person's own answers**, never from AI prose,
because this is the one artifact that leaves the app with his name on it and
gets shown to partners and advisers. Three pages carry it: the decision in one
page, the money thread (what you guessed in Step 1, found in Step 2, declared
in Step 3, and what that means in months), and what does not line up yet --
each line a comparison between two things the person wrote themselves.

## Released to production (8 October 2026)

`next-version` merged into `main` after 33 commits: **Modules** (free material,
the Introduction, three phases, steps, lessons), the **bottom tab bar**, the
**video player** (Video.js on Bunny, signed playback), **dark mode**, the
**workbook PDFs**, **Step 2 open from the issued workbook**, **Help by email**,
and **free access** — switched off.

**Checked before pushing:** every table the new build reads exists in the live
database (entitlements, video_progress, the two new profile columns) and both
storage buckets are there; production build, typecheck, lint and 93 tests;
`NEXT_PUBLIC_REQUIRE_PURCHASE` is set for **Preview only**, so nothing is
locked for anyone.

**Checked after:** every route answers, the privacy page gives
info@maderealblueprint.com, `/free` is live, and production still computes
`requirePurchase` from an undefined variable — buying is off, as intended.

**Michael had written nothing yet** (0 answers, 0 pages, two AI messages, last
seen 5 October), so the release could not disturb anyone. He is taking notes on
his phone and starts at the weekend.

## Free access (8 October 2026)

Spec §6.2, build order slice 4. Built on `next-version`, **switched off**.

**What is there**
- `/free` — the link to share. Three lines on what a free account opens, then
  the same sign-in form as `/signin` (one piece of code, in
  `components/sign-in-form.tsx`, because the one-token-per-email rule is too
  easy to break twice). `/free?from=instagram` is remembered, cleaned to a
  short plain word, and written to the profile at the consent page, together
  with the "send me an occasional update" tick.
- **What free opens** is `access.json` and nothing else: the Introduction, page
  1.2 (the Ordinary Tuesday) and one lesson, `step-1:p1`, so people meet Mwata
  before they buy. Changing it is one line of content.
- **Every door asks the access layer** now — the step overview, a page inside a
  step, the print page, the Modules screens and the Exercises overview. What is
  not yours says "part of the course" and offers Phase 1; what is not written
  says "coming soon". The two are never muddled.
- A phase you have not bought **opens** so you can see the steps and watch the
  free lesson. Its workbook, its other lessons and its exercises do not.
- **The AI partner** works on a free account with `FREE_PARTNER_DAILY_LIMIT`
  (15 a day) instead of 80, and will not draft a summary.
- **Admin** shows free or paying, where each person came from, who wants
  updates (with a copy button for the addresses), and how much of the AI cost
  is free accounts.
- Two new profile columns: `came_from`, `wants_updates`.

**A free account is a lean app (8 October, Mwata's call).** Not the whole app
with padlocks on it: the screens show what is true for the person reading them.

- **Two places, not four.** Modules and Settings. The Exercises overview is the
  whole eight-step road — the structure a free account should not be shown —
  and the AI partner comes with the course.
- **Modules** shows Free material, the Introduction and Phase 1, with no
  progress bars. Inside Phase 1: the free lesson and the free exercise as two
  rows, no steps around them, and the offer underneath.
- **The free exercise** stands on its own: no part rail, no page counters, no
  chips to its locked sisters. Just the exercise and the way back.
- **No AI and no pictures.** The partner panel is gone, the `image_board` field
  is not drawn, and the server answers "Your AI partner comes with the course."
  The 15-a-day limit is gone with it; a thing you do not have needs no ration.
- **The consent page asks only what is true.** A free account was being asked to
  agree to picture storage, AI reading and chat history that do not exist for
  it. It now agrees to one thing: what I write is stored in my own account, and
  I can delete it whenever I like. The full page is asked for when the course is
  bought (§6.1).
- **Settings keeps what a free account needs** — name, light or dark, Help, and
  the way to delete everything — and drops the currency and the two permissions.
- **What they write is saved.** It is theirs, it is still there when they come
  back, and it is still there when they buy. That is the pull.
- **The Introduction gives the video, not the workbook.** The workbook comes
  with the course, and the server says so too, so the address is no use either.
- **No arrows under the free exercise**: there is no page before or after it.
- **No privacy notes.** The footer describes an AI partner a free account does
  not have, and the consent page already says what is stored. One plain
  **Privacy** link stays in Settings, so the notice is still reachable by the
  people it covers.

**Fixed on the way:** a phase with nothing written in it was offered for sale
when you did not own it. Released is now asked before bought, everywhere.

**Not built, on purpose**
- Sign-up limits per network address. Supabase already limits codes per email
  and per hour, and `NEXT_PUBLIC_INVITE_ONLY` still closes the door entirely.
  Worth revisiting if the free link is ever abused.
- MailerLite. The tick is recorded; nothing is sent (decided 6 October).
- "Bought but no access?" and the welcome email belong to §6.1 (purchases),
  which waits for the Lemon Squeezy identity review.

**Before switching it on** (`NEXT_PUBLIC_REQUIRE_PURCHASE=true` in Vercel):
every founding member must have an entitlement first, or they lose what they
have. Admin → the person → **Give: Phase 1**. Check Michael before anyone else.

## A dark ground, and a switch (6 October 2026)

Mwata wanted the app on black, like an app he had seen, without leaving the
brand. The brand guide turned out to answer it already: its own dark rules are
Sand text, Ochre-light for the accent (the guide allows Ochre-light only on Pine
or Granite), cards as a thin veil of Sand over the ground, and #B9C0B2 for
captions. Those are the values used, on a near-black ground rather than the
guide's Pine, which Mwata chose after seeing both.

- **src/app/dark.css** redefines the token names the app already uses, so no
  component changed, only what the names point at. Two names do double duty and
  needed a decision: Pine is headings and the filled button, so on black
  headings become Sand and the filled button becomes Ochre; Ochre itself is too
  dark to read on black, so it becomes Ochre-light.
- **A switch in My settings**: follow my device (the default), light, or dark.
  Kept in this browser rather than in the account, because it belongs to the
  screen you are reading on and because it has to be known before the first
  pixel: a small script in the page head sets it, so there is no flash of the
  wrong ground. src/lib/theme.ts holds the rules, theme-store.ts makes them
  something React can subscribe to.
- **The mark now follows the theme** (brand.tsx reads the tokens instead of
  fixed hex), so the terraces are Sand on black with the dot still gold, rather
  than Pine lines that disappear.
- **Printing stays on paper.** The print rules put the light palette back, so a
  Working Direction never prints on black. Checked in the built stylesheet.

Checked in the app: a light device with no choice gets the light app untouched,
a dark device with no choice gets dark, a chosen light beats a dark device, and
a choice survives a reload with the attribute already set before paint.

## Releasing while someone is working (4 October 2026)

Answers are written straight from the browser to Supabase, so a release cannot
touch them: Vercel swaps the website, the database is untouched, and a failed
save retries every five seconds. The one thing a person can notice is a tab left
open across a release: it still holds the old files, and moving to a page whose
file changed asks for a file that is no longer there.

Measured on the live site (4 October): a release that changed 3 of the 13
files on a page left all three of the old ones still being served, 200 each.
Vercel keeps content-addressed files across releases, so in practice a tab left
open keeps working. The reload below is the safety net for when it does not.

The app now recognises that. src/lib/stale-version.ts tells "this tab is old"
apart from a real fault, and the error screen loads the page afresh instead of
offering "Try again", which would only run the same old code. At most one
automatic reload a minute, so a page broken for another reason cannot spin; if
it is held back, the screen says "A newer version is ready" with a button.

Vercel Skew Protection, which would pin a tab to the version it started on, is
Pro and Enterprise only. This project is on Hobby, so it is not available
without upgrading, and the reload above covers the same ground.

The real risk is not releasing, it is renaming. Answers are stored under a page
id and a field id; rename one and the answer stays under the old name and the
box looks empty. Wording may change freely, ids may not, while anyone is
working.

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
