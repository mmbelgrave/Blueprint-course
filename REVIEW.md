# Review handoff — LLM2 (Reviewer), 2026-09-18

## Original request and agreed success checks
`build-prompt-v1.md` (feature brief) and `PROJECT.md` (acceptance checks 1–9).
This review covers only what is built: milestones 1–2 (skeleton + workbook, no AI).
Most relevant check: **2. Answers autosave and are still there after closing the browser.**

## Exact work reviewed
All files in `web/src`, `web/supabase/schema.sql`, `web/scripts/sync-content.mjs`,
config files, as on disk 2026-09-18 (no git, so no commit id). `PROGRESS.md`
was read, but its claims were checked again, not trusted.

## Checks that actually ran
| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `eslint` | pass |
| `next build` | pass (8 routes) |
| `src/content/step1-content.json` is identical to `../step1-content.json` | yes |
| Script: every field type, field key and exercise key in the content is handled by the app | yes, 20 exercises, no unknown types, no duplicate IDs |
| Browser, preview mode: number entry in 3.2 | **bug reproduced** (finding 1) |
| Browser, preview mode: storage made to fail on purpose | **bug reproduced** (finding 2) |
| Browser: unknown exercise URL `/part/p1/9.9` | friendly message, OK |
| Browser console errors | none |

Test data in the browser was backed up first and restored afterwards.

**Not checked:** real Supabase sign-in, row-level security, anything with a
real database. There is no Supabase project yet. Findings 3–4 therefore come
from reading the code, not from running it.

## Findings — confirmed (reproduced)

### 1. Money amounts with a thousands separator are read wrong  (HIGH)
- **Where:** `web/src/components/fields.tsx:29-32` (`toNumber`).
- **What happens:** `1.500` counts as 1.5. `1,500` also counts as 1.5.
  `€200` counts as 0. In 3.2 I typed 1.500 + 1,500 + €200: the total
  showed **€3** instead of €3,200.
- **Why it matters:** people in Portugal and the Netherlands write `1.500`
  for fifteen hundred. The totals in 3.2, 3.3 and 3.4 become wrong without
  any warning. The 3.5 hint ("That looks like a yes/no") and the "+30%"
  figure are built from these totals, so they are wrong too.
- **Fix idea:** accept common formats (remove spaces and currency signs; read
  `1.500`, `1,500`, `1 500` as 1500; keep `12,50` / `12.50` as decimals), or
  show a small note when an amount is not a clear number.
- **How to check the fix:** in 3.2 "In my new life", type `1.500`, `1,500`,
  `€200`, `12,50`. The total must be €3,213 (rounded display).

### 2. "Saved" can show while the answer was not saved  (HIGH for check 2)
- **Where:** `web/src/lib/app-state.tsx:101-108`, `web/src/lib/backend/local.ts:21-25`.
- **Reproduced (preview mode):** I made browser storage fail, then typed
  `77` in 3.2. The label showed **"Saved"**. The value was not stored.
- **Same problem with Supabase (from the code):** if one field fails to save,
  the label shows the error. But when *any other* field saves after that,
  line 105 sets the label back to "Saved". The failed field is never tried
  again. So a person can see "Saved" while one answer is lost.
- **Fix idea:** keep a list of failed fields. Retry them. Only show "Saved"
  when nothing is waiting and nothing has failed. In preview mode, report a
  storage error instead of swallowing it.
- **How to check the fix:** in DevTools, go offline (Supabase) or make
  `localStorage.setItem` throw (preview). Type in field A, go online, type in
  field B. The label must not say "Saved" until A is saved too.

## Findings — from reading the code (not run, needs Supabase)

### 3. A failed data load sends an existing user to the consent screen  (MEDIUM)
- **Where:** `web/src/lib/app-state.tsx:49-62` (no `catch`),
  `web/src/components/Shell.tsx:76-82`.
- **What would happen:** if loading data fails (bad connection, database
  error), the app thinks there is no profile and opens `/onboarding`. If the
  person fills it in again, their "Mwata may read my answers" choice is reset
  to off. The workbook also looks empty, which is scary.
- **Fix idea:** a separate "could not load" state with a "Try again" button.
- **How to check:** with Supabase, block the `profiles` request in DevTools
  and reload `/dashboard`. You should see an error and a retry button, not
  the consent page.

### 4. Some save errors are not shown at all  (MEDIUM)
- **Where:** "Mark as done" `web/src/app/part/[partId]/[exerciseId]/page.tsx:221,226`
  → `app-state.tsx:73-80`. Consent form `web/src/app/onboarding/page.tsx:22-33`.
- **What would happen:** if "Mark as done" fails, the screen shows "Done"
  but the database does not. If saving the consent form fails, the button
  stays on "Saving…" forever with no message.
- **How to check:** go offline in DevTools, press "Mark as done", reload.

## Concerns (not tested — worth a look)
5. **Slow connection:** two saves for the same field can arrive in the wrong
   order, so an older text could overwrite a newer one
   (`app-state.tsx:97-110`). The "leave this page?" warning only covers the
   0.8-second wait, not a save that is still being sent.
6. **Side effect inside a state update** (`app-state.tsx:89-95`): in
   development React may run it twice, so the "in progress" status is sent
   twice. Harmless now, but easy to tidy up.
7. **Accessibility:** single-choice answers (3.5, 5.1) are buttons inside
   `role="radiogroup"` (`fields.tsx:113`). Screen readers expect radio
   buttons there. Use real radio inputs, or `role="radio"` + `aria-checked`.
8. **Brief gaps (small):** the interface language is not asked (always
   `"en"`; the brief allows English for v1). "Continue where I stopped" goes
   to the first unfinished exercise in the recommended order, not the last one
   the person used.
9. **For milestone 5:** a hidden 5.1 answer ("Not yet — what first?") stays
   saved when the person changes their answer. The Direction page must not
   show it then.

## Looks good
- Content comes only from `step1-content.json`; no invented texts found.
- All 8 field types render; show_if, the 4.1 → 4.2 option names and the table
  totals work (apart from finding 1).
- Database design: row-level security on every table, owner-only rules,
  `usage_log` readable but not writable by users, EU region in the README.
- No secret keys in browser code; `.env*` is in `.gitignore`.

## Already known (in PROGRESS.md, not repeated as findings)
4.1 prefill only saved after an edit; wide tables scroll on phones; privacy
text is a placeholder; no git; code folder inside OneDrive.

## Fixes and rechecks
LLM1 (Engineer), 2026-09-18. All findings were checked against the files and
agreed. None disputed.

| # | Status | What changed |
|---|---|---|
| 1 | **Fixed** | `toNumber` moved to `web/src/lib/numbers.ts`; reads `1.500`, `1,500`, `1 500`, `€200` as whole amounts and `12,50` / `12.50` as decimals. When both `.` and `,` appear, the last one is the decimal point. |
| 2 | **Fixed** | New `web/src/lib/answer-saver.ts`: remembers failed fields, retries every 5 s and when the internet comes back, and shows "Saved" only when nothing is waiting, sending or failed. Error text: "Not saved yet. We keep trying…". Preview mode now reports storage errors (`local.ts`). |
| 3 | **Fixed** | Loading errors now give a "could not load" message with a "Try again" button (`app-state.tsx`, `Shell.tsx`), with no redirect to sign-in or consent. A network error from Supabase `getUser` no longer looks like "signed out". |
| 4 | **Fixed** | "Mark as done" undoes the change and shows a message if saving fails. The consent form shows a message and re-enables its button. |
| 5 | **Fixed** | Saves of the same field are chained, so they arrive in order and newer text wins. The "leave page?" warning also covers saves that are still being sent. |
| 6 | **Fixed** | The status update no longer happens inside a state updater. |
| 7 | **Fixed** | Single-choice and yes/no answers use `role="radio"` + `aria-checked` inside a `radiogroup`. |
| 8 | Partly | "Continue where I stopped" now opens the last exercise used on this device (if not done), else the first unfinished one. Interface language: left as English, which the brief allows for v1. |
| 9 | Open | Noted for milestone 5 (the Direction page must ignore the hidden 5.1 answer). |

Found while rechecking: `.env.local` had the Supabase URL without `https://`,
so every page was blank. Fixed in the file. `proxy.ts` now catches Supabase
errors, so a wrong setting shows the "could not load" message, not a blank site.

**Checks that ran after the fixes**
| Check | Result |
|---|---|
| `tsc --noEmit`, `eslint`, `next build` | pass |
| `npm test` (new, `web/tests/`) | 8/8 pass. Includes finding 1's exact input (sum 3212.5 → €3,213) and finding 2's scenario (field A fails, field B saves: not "Saved" until A is stored after retry), plus in-order saves and "old failed value must not overwrite newer". |
| Real Supabase, not signed in | all 8 tables exist; anonymous insert into `answers` is refused by row-level security (42501) |
| Browser `/signin` with Supabase | real email form shown, no preview bar |

**Not re-checked in the browser yet:** findings 2–4 with a signed-in user
(this needs Mwata to sign in with a magic link), and RLS between two signed-in
users. Suggested for the next review round.

---

# Review round 2 — LLM2 (Reviewer), 2026-09-22

## What was reviewed
The version on disk on 2026-09-22 (files last changed 2026-09-21; no git).
It is much bigger than round 1: Step 1 v9 + Step 2 v2, the AI partner
(milestone 3), memory and `/me` (milestone 4), drafts, feedback and print pages
(milestone 5), settings, and real Supabase + Anthropic keys. Checked against
`build-prompt-v1.md`, the update sections in `PROJECT.md` (checks 1–14) and
the round 1 fixes above.

## Checks that actually ran
| Check | Result |
|---|---|
| `tsc --noEmit`, `eslint`, `next build` | pass (18 routes) |
| `npm test` | 22/22 pass |
| Content copies in `web/src/content` equal `../step1-content.json` and `../step2-content.json` | yes |
| Script: every page and field named in `PROFILE_SOURCES` ("Forget this") and in the draft rules exists in the content | yes, 0 missing |
| Number reader, 21 ways of writing amounts (`1.500`, `1,234,567.89`, `1.234,56`, `2 000 €`, `EUR 1.200` …) | all read correctly |
| Browser files (`.next/static`, 23 files) scanned for the service-role key, Anthropic key, admin email and prompt texts | none found |
| Browser, preview mode: 3.2 with `1.500`, `1,500`, `€200`, `12,50` | total €3,213 (round 1 finding 1 fixed) |
| Browser, preview mode: storage made to fail, then work again | "Not saved yet. We keep trying…", then "Saved" only once stored (finding 2 fixed) |
| Browser: consent → dashboard (both steps) → print page, console | works, no errors |
| Browser, 375 px width: 8 pages | header too wide on every page (finding R2-2) |

Browser test data was made up and removed afterwards. The preview server I
started was stopped again.

**Not checked (needs a signed-in account; I may not create one or sign in):**
the AI partner, "What my AI partner knows", drafts and "Delete everything"
with real data; row-level security between two signed-in users. I did not call
the Anthropic API (it costs money); the Engineer's live checks
(`partner-check`, `profile-check`, `draft-check`) were read, not repeated.

## Round 1 findings — recheck
| # | Result |
|---|---|
| 1 Money amounts | **Fixed**, confirmed in browser and by 21 test inputs. |
| 2 False "Saved" | **Fixed**, confirmed in browser (preview) + unit tests. |
| 3 Load error → consent screen | **Fixed** in code (`Shell.tsx:84-86`: no redirect after a load error). Not run with Supabase. |
| 4 Silent save errors | **Fixed** in code (Mark as done undoes + message; consent form shows error). Not run with Supabase. |
| 5 Saves out of order | **Fixed** (per-field chain in `answer-saver.ts`, unit-tested). |
| 6, 7 | **Fixed** in code. |
| 8 | Partly, as LLM1 wrote. Accepted (brief allows English for v1). |
| 9 Hidden 5.1 answer on print | **No longer applies**: no field in the v9 / Step 2 content has a `show_if` rule. If one is added later, `print/page.tsx` must check it (it prints every filled field). |

## New findings — confirmed

### R2-1. "Forget this" and "Correct this" can be silently undone  (HIGH)
- **Where:** `web/src/app/api/profile/route.ts:33-51` with
  `web/src/lib/partner/profile-update.ts:45-79`; `web/src/app/me/page.tsx:115-130, 256-272`;
  trigger in `web/src/lib/app-state.tsx:101-108`.
- **What happens (from the code):** the notes update reads the person's notes
  at the start, waits for the AI model (several seconds), then writes the
  whole notes record back. If the person presses "Forget this" or "Correct
  this" during that wait, the server overwrites it with its old copy. The
  forgotten topic comes back, and it is no longer on the "forgotten" list, so
  the partner uses those answers again.
- **When it happens:** (a) on `/me`, press "Update from my answers now", then
  "Forget this" while it says "Updating…" (the Forget button is not disabled);
  (b) mark a page as done, which starts an update in the background, then open
  "My notes" and forget something within those seconds.
- **Why it matters:** this breaks the privacy promise on `/me` and acceptance
  checks 6 and 14. The person sees no warning.
- **Fix idea:** just before writing, the server reads `_locked`, `_forgotten`
  and the locked values again and applies them (or keeps them in their own
  columns that the update never writes). On `/me`, disable Correct/Forget
  while "Updating…", and do not replace the screen with a stale result.
- **How to check the fix:** a unit test where the notes change between the
  read and the write (the forgotten item must stay empty and on the list). By
  hand, signed in: press "Update from my answers now", press "Forget this" on
  a filled item at once, wait, reload `/me` — the item must still be
  forgotten.
- **Evidence level:** confirmed by following the code path; not run (needs a
  signed-in account).

### R2-2. On a phone the top menu is too wide  (LOW–MEDIUM)
- **Where:** `web/src/components/Shell.tsx`, header `<nav>` (around line 36).
- **Reproduced:** at 375 px width, on every page I tried (dashboard, Step 2
  overview, s2-1.2, s2-3.2, 3.5, 5.1, `/me`, `/settings`), the page is 389 px
  wide. "Sign out" is cut off at the right edge, and the whole page can move
  sideways.
- **Fix idea:** let the menu wrap to a second line on small screens, or put
  it behind one "Menu" button.
- **How to check:** browser at 375 px: `document.documentElement.scrollWidth`
  must be 375 and "Sign out" fully visible.

## Concerns (not tested)
1. **Forgotten topics can live on in "patterns".** Forgetting e.g. fears
   empties the fears note, but `patterns_and_tensions` may still say
   "…afraid of losing income…". That text is still sent to the partner in
   every chat (`prompt.ts:151-156`) and back to the model at the next update
   (`profile-update.ts:47-48`). The partner is told not to use forgotten
   topics, and the Engineer's live test passed, but the data itself is still
   there. Idea: when something is forgotten, also clear
   `patterns_and_tensions` (it is rebuilt at the next update).
2. **Cost limits can be bypassed by a technical user:** the 80 messages/day
   limit counts rows in `conversations`, which people may delete themselves
   (the RLS "own rows" rule allows delete), and `pageAnswers` in
   `/api/partner` has no size limit. Low risk with 4 pilot users; fix before
   more people join (count from `usage_log`, which users cannot change; cap
   `pageAnswers`).
3. **"Delete everything"** leaves `blueprint-last-exercise:<id>:<step>` in the
   browser's storage (only a page number, no answers). Tiny; clear it on delete.
4. A partner reply cut off by the length limit (`stop_reason: "max_tokens"`)
   is saved and shown as if complete (`api/partner/route.ts:121-141`).
   Unlikely with 16,000 tokens; a short note would be enough.

## Looks good
- Keys stay on the server; every AI route checks sign-in and the AI consent
  switch; logs contain numbers only, never answer text.
- "Delete everything" deletes the account with the service key; every table
  cascades on the user.
- The partner prompt follows brief section 5 closely, including "never write
  their answers", no advice, no selling, crisis care, and the Step 2 rule
  "never state rules or prices as certain".
- Drafts use only the allowed pages and skip forgotten topics; the draft
  limit is counted in `usage_log`, which people cannot change.
- Settings lets people change both consents, as the consent screen promised.

## Suggested order for LLM1
1. R2-1 (privacy promise). 2. Concern 1. 3. R2-2. 4. Concerns 2–4 before more
users join. Then a signed-in walk-through by Mwata: forget an item, chat on
that topic's page and on another page, and "Delete everything" with a test
account.

## Fixes and rechecks — round 2
LLM1 (Engineer), 2026-09-22. All findings checked against the code and agreed;
none disputed. Fixed in the suggested order.

| # | Status | What changed |
|---|---|---|
| R2-1 | **Fixed** | New `applyPersonChoices` (`profile-fields.ts`): `/api/profile` reads the notes **again right before saving** and applies the person's latest `_locked` / `_forgotten` (corrected values kept, forgotten items empty). On `/me`, Correct / Forget / Allow again are disabled while "Updating…". Unit tests for both races (forget and correct during the update). |
| Concern 1 | **Fixed** | "Forget this" also empties `patterns_and_tensions` (unless the person corrected that note); `applyPersonChoices` does the same when a topic was forgotten during an update. It is rebuilt at the next update without the forgotten answers. |
| R2-2 | **Fixed** | Header and menu wrap on small screens (`Shell.tsx`). Rechecked at 375 px — see below. |
| Concern 2 | **Fixed** | Chat limit counted in `usage_log` (people cannot change it) when the service key is set; chats only as fallback. `pageAnswers` ignored above 50,000 characters. |
| Concern 3 | **Fixed** | "Delete everything" also removes the app's `blueprint-…` keys from the browser's storage. |
| Concern 4 | **Fixed** | A reply cut off at the length limit gets "(My answer was cut off. Please ask me again.)", also in the saved chat. |

Also: the older autosave test "never 'saved' while another field failed" was
timing-sensitive (failed once when the machine was busy: the retry came before
the check, so "Saved" was actually correct). Its retry delay is now 600 ms and
it also checks that A is not stored yet; 3 runs in a row 27/27.

**Checks after the fixes:** `tsc`, `eslint` pass; `npm test` 27/27 (5 new).
Browser at 375 px, the same 8 pages as the reviewer (dashboard, `/step/2`,
s2-1.2, s2-3.2, 3.5, 5.1, `/me`, `/settings`): `scrollWidth` = 375 on all,
"Sign out" fully visible (right edge 315 px).
**Still not checked (needs a signed-in account):** the R2-1 race by hand, RLS
between two accounts, "Delete everything" with a test account.

---

# Review round 3 — LLM2 (Reviewer), 2026-10-01

## What was reviewed
Commit `c90fd61` (branch main, working tree clean): Step 1 workbook v19 and
Step 2 v8, the new brand and navigation, examples next to the box, the vision
board with pictures, milestone 6 (admin view), milestone 7 (polish), the
redesigned printed result, and the invite-only pilot settings. Checked against
`build-prompt-v1.md`, the update sections in `PROJECT.md` (checks 1–14) and
the round 2 fixes.

## Checks that actually ran
| Check | Result |
|---|---|
| `tsc --noEmit`, `eslint` | pass |
| `npm test` | 27/27 pass |
| Production build (the preview copy builds the real thing) | pass, 18 routes |
| Content copies in `web/src/content` equal the four files in the project folder | yes |
| Script: every cross-reference in both workbooks — copy-from, calculation sources, row and column sources, total filters and their allowed values, prefill labels, show-if fields, forget rules, draft rules | 48 pages, 173 fields, **0 problems** |
| Script: every field type the content uses is one the app renders | yes (10 types, no unknown ones, no duplicate ids) |
| Script: every answer type through the text the AI partner, print page and admin view use | no crashes; a vision board becomes "2 pictures. The lines under them: …" and **never a file name or path** |
| Browser files (`.next/static`) scanned for the service-role key, Anthropic key, admin email and the AI instructions | none found |
| Browser: all **61 pages** of the app at 1280 px and at 375 px | every page has a title, none wider than the screen, no page errors |
| Browser: money chain 3.2 → 3.3 → 3.4 → 3.5 with a real "unknown" and a "hoped" income | correct throughout (see below) |
| Browser: check 11 (4.2 shows my must-haves from 1.4 and my option names from 4.1) | pass |
| Browser: check 13 (Step 2 start page copies nothing without a click) | pass |
| Browser: mark as done, part feedback (4 stars), progress rail | saved and shown correctly |
| Browser: `/admin` without an admin account | server refuses: "This page is only for the admin." |
| Browser console / network | only the expected 403 from the admin check in preview mode |

The money chain in detail: costs €1,200 + €300 with one row marked Unknown →
"€1,500 + unknown"; income €2,000 Confirmed + €500 Hoped → "Total confirmed
€2,000", hoped money correctly left out; 3.5 then shows income €2,000, costs
"€1,500 — not complete yet", "€500 left over — not complete yet", savings
€20,000 − €5,000 − €2,000 − €3,000 = €10,000, and with income lowered to
€1,000: "20 months — not complete yet". The "not complete yet" warning travels
all the way through, which is exactly the workbook rule.

Test data was made up, and removed afterwards. The preview server I started
was stopped. The working tree is unchanged (`git status` clean).

**Not checked (needs a signed-in account; I may not sign in or create one):**
the AI partner, the notes page, drafts, the admin view with real data,
uploading a picture, "Delete everything", and row-level security between two
accounts. I did not call the Anthropic API (it costs money); the Engineer's
live checks were read, not repeated.

## Round 2 findings — recheck
| # | Result |
|---|---|
| R2-1 "Forget this" undone by an update | **Fixed.** `/api/profile` reads the notes again right before saving and re-applies the person's choices (`applyPersonChoices`); `/me` blocks Correct/Forget while updating. Covered by `tests/person-choices.test.ts`. |
| R2-2 header too wide on a phone | **Fixed.** Measured again at 375 px on all 61 pages: no page wider than the screen. |
| Concern 1 forgotten topic in "patterns" | **Fixed.** Forgetting clears `patterns_and_tensions` too, unless the person corrected that note themselves. |
| Concern 2 cost limits | **Fixed.** The chat limit is counted in `usage_log` (people cannot change it), with chats as fallback; `pageAnswers` over 50,000 characters is ignored. |
| Concern 3 leftovers in browser storage | **Fixed.** |
| Concern 4 cut-off reply | **Fixed.** The reply gets "(My answer was cut off. Please ask me again.)". |

## New findings

### R3-1. The consent screen and privacy page do not mention the pictures  (MEDIUM — before the pilot)
- **Where:** `web/src/app/onboarding/page.tsx` (the "we store" list) and
  `web/src/app/privacy/page.tsx` ("What we store", "Deleting").
- **What is wrong:** the app now stores photographs — of someone's home,
  family, street — in Supabase storage. Both places that tell people what is
  kept were written before the vision board existed and still list only
  answers, chats, notes and feedback. The delete screen does mention pictures
  (`me/page.tsx:160`), so the app contradicts itself.
- **Why it matters:** this is a privacy-first product about to be shown to
  real people, and photos are the most personal thing in it. The promise has
  to match what happens.
- **Fix idea:** add one line to both: pictures you add to your board are
  stored in your own folder in the same European database, only you can open
  them, your AI partner only reads the line you write under a picture, and
  they are deleted with everything else.
- **How to check:** read both pages; every kind of data in `schema.sql` plus
  the `boards` store appears in the list.

### R3-2. Picture problems show the person a technical error  (LOW–MEDIUM)
- **Where:** `web/src/components/board.tsx:63-64` shows `e.message` directly;
  the messages come from `web/src/lib/backend/pictures.ts` and Supabase.
- **What happens:** if `web/supabase/storage.sql` has not been run yet, the
  person sees "Bucket not found". A blocked upload shows "new row violates
  row-level security policy". A photo the browser cannot decode (an iPhone
  HEIC file on a desktop browser) shows "The source image could not be
  decoded" — and `createImageBitmap` is what fails, so this is not caught as
  a friendly `PictureError` at all.
- **Fix idea:** one plain sentence per case ("This picture could not be
  opened. JPEG or PNG works best."), with the technical detail in the console
  only. And make sure the bucket exists before the pilot — `GO-LIVE.md`
  already has the step, but 1.2 breaks if it is skipped.

### R3-3. "Delete everything" leaves the pictures when the service key is missing  (LOW)
- **Where:** `web/src/app/api/account/delete/route.ts:35-45`: `deletePictures`
  runs only inside `if (admin)`. In the fallback path (no service-role key)
  the rows go, the account stays, and the pictures stay too — while the
  screen says everything is gone.
- **Why it matters:** on Vercel the key will be set, so this is the fallback
  only. Still, it is the one promise where silence is worst.
- **Fix idea:** delete the pictures in both paths, or say plainly what could
  not be removed.

### R3-4. 3.5 shows an empty table when you have money left over  (LOW, cosmetic)
- **Where:** `web/src/components/fields.tsx` `Calculation` — rows that are
  hidden by their condition leave an empty table with only its headers.
- **Reproduced:** with €500 left over each month, "Question 3: how long?"
  shows an empty box with "Example | Me" and nothing in it.
- **Fix idea:** when every row of a calculation is hidden, leave out the whole
  block (or say "Only needed if you are short each month").

### R3-5. A row marked "Unknown" makes the *other* column's total look used  (VERY LOW, cosmetic)
- **Where:** `web/src/lib/money.ts:45`.
- **Reproduced:** in 3.2 I filled only "in my new life" amounts and marked one
  row Unknown. The **Today** column then shows "€0 + unknown", although no
  "today" amount was ever typed. Expected: "—".

## Concerns (not tested)
1. **Picture links last an hour.** A page left open longer shows empty picture
   frames until it is reloaded (`pictures.ts:11`, board and print page). A
   fresh link on error, or a gentle "reload to see your pictures", would help.
2. **A picture uploaded while saving fails** stays in storage without being in
   any answer. It is only cleaned up by "Delete everything".
3. **The admin overview reads up to 1000 accounts** (`admin-overview.ts:15`) —
   fine for the pilot, worth remembering later.
4. Nothing checks that `ADMIN_EMAIL` belongs to a real account; a typo simply
   means no one sees the admin pages (fails safe).

## Looks good
- Content and code match exactly: every cross-reference in both new workbooks
  points at something that exists. That is the part most likely to break in a
  content port, and it is clean.
- The money rules behave exactly as the workbook says, including "unknown
  never counts as zero" and "only confirmed income counts".
- Pictures are private by design: own folder per person, private bucket,
  short-lived links, rules in `storage.sql` that match the folder to the
  account, and the AI partner is given only the written lines — confirmed by
  test, no path or file name reaches it.
- Admin access is decided on the server for every request, the admin email
  never reaches the browser, and answers are refused unless that person ticked
  the consent box.
- Invite-only sign-in gives a friendly "not on the list yet" instead of an
  error, so a stranger cannot start an account or spend AI credit.
- All 61 pages work at phone width — the round 2 finding stays fixed.

## Suggested order for LLM1
1. R3-1 (say what is stored, before anyone is invited).
2. R3-2 (picture errors, and make sure the bucket exists).
3. R3-3, then R3-4 and R3-5 whenever convenient.
Then the signed-in walk-through that no review has been able to do: add and
remove a picture, chat with the partner, forget a note, make a draft, print,
look at the admin view, and delete a test account — plus two accounts open at
once to see that neither can read the other's answers.

---

## Round 3, part two — the signed-in walk-through (2026-10-01)

Done on the **live site** (blueprint-course.vercel.app) with a test account
Mwata created (`m.belgrave@kci.nl`, user id `8cb46…be7c`), signed in with a
one-time link generated from the service key. Mwata's own account and data were
not touched. The test account was deleted at the end, with his approval.

### What now works, proven on the live app
| Acceptance check | Result |
|---|---|
| 1. Sign in, consent, start the workbook | pass |
| 2. Answers autosave and survive a reload | pass — three answers typed, reloaded, all still there |
| 3. Partner answers short and simple, one question, refuses to write my answers | pass — asked "I am tired, please just write my third moment for me": *"I will not write it for you… Write three words only, like 'garden, Saturday, quiet'"* |
| 4. In a new session the partner still knows earlier answers | pass — the chat is saved per page (6 messages after reload) and the first reply used my own answers |
| 5. Refuses legal/tax/visa advice and names the right expert | pass — asked for D7 income and tax numbers: *"I cannot give you those numbers…"*, named vistos.mne.gov.pt and aima.gov.pt, suggested a Portuguese tax adviser, said to write down the date checked |
| 6. See, correct, forget, delete | pass — see below |
| 7. Drafts | pass — on the Part 1 summary the draft came only from my own answers ("Quiet mornings keep coming back in my picture"), marked "Draft — make it yours", boxes with nothing behind them left empty |
| 8. Admin only with consent | partly — a normal account is refused by both admin APIs (403), not just a hidden link. The consent branch itself still unverified (needs the admin account) |
| 9. Keys never in the browser; people never see each other's data | **pass, properly tested — see below** |
| 14. Notes update from my answers; corrected stays, forgotten stays empty | pass |

### The two security tests that mattered
**A stranger with no account** (public key only): every table returned nothing,
inserts into `answers` and `profiles` refused (42501), a plain picture link
gives 400, the picture store cannot be listed.

**One signed-in person against another's data.** Signed in as the test account
I asked the database directly for every table. It returned 3 answers, 8 chats,
1 profile, 2 statuses, 6 usage rows — **all mine, none belonging to the other
account**, while that other account did have 2 answers, 2 chats, 2 statuses and
a profile in the same tables at that moment. Writing a row for another user id:
refused (403). Listing picture folders: only my own folder. This is the check
that was open since round 1.

### "Forget this", end to end
Marking a page done filled the note "What your good moments have in common"
from my answers only. Pressing **Forget this** emptied it and it stayed
forgotten after a reload. On a **different page** the partner then said: *"I do
not have earlier answers from you saved"* — so the answers behind the forgotten
note really are hidden from it. While a notes update is running, Correct this /
Forget this / Allow again are disabled (the R2-1 fix, confirmed in the live app).

### Pictures, end to end
Uploaded a picture on 1.2: stored under `boards/<my user id>/1.2/…`, shown
through a signed link (200), the same file without a signature refused (400).
The caption saved. The printed Step 1 result showed the picture and its line.
**Remove** took it out of the answer and deleted the file from the store (0
files left). The `boards` store on the live project exists and is private,
5 MB per picture, images only — so storage.sql has been run.

### "Delete everything"
Everything went: 0 rows in all eight tables, the account itself deleted, the
picture folder gone, and the app's keys cleared from the browser. Only Mwata's
own account remains in the project.

## New findings from the live walk-through

### R3-6. After "Delete everything" people land on the sign-in page, not the confirmation  (LOW–MEDIUM)
- **Where:** `web/src/app/me/page.tsx:191-192`.
- **What happens (reproduced):** the code sends the person to `/deleted` and
  then signs them out. Signing out empties the app state while `/me` is still
  on screen, and `RequireUser` immediately redirects to `/signin` — which wins
  the race. The "Everything is deleted" page exists but is never seen.
- **Why it matters:** someone who just deleted their life story gets an
  anonymous sign-in form, with no word that it worked, nothing about whether
  the account itself is gone, and no way back to the explanation.
- **Fix idea:** sign out first and then navigate, or keep a "deleting" flag so
  `RequireUser` does not redirect while the delete is finishing.
- **How to check:** delete a test account; the confirmation page must appear.

### R3-7. The sign-in email is the weakest part of going live  (HIGH for the pilot)
Two separate problems, both seen today:
- **Outlook Safe Links uses the link before the person does.** The magic link
  sent to an `@kci.nl` address was already spent on its very first open
  ("otp_expired"). Microsoft's scanner fetches links in incoming mail, and a
  magic link is single use. Invitees on Microsoft 365 may never get in.
- **Supabase's own email sender runs out.** Creating a user by invitation
  failed with "email rate limit exceeded" after a handful of mails. The free
  built-in sender allows only a few per hour across all auth email.
- **Fix idea:** set up custom SMTP (GO-LIVE.md already lists this) *before*
  inviting anyone, and test one invitation to a Microsoft 365 address end to
  end. If Safe Links keeps eating links, send a 6-digit code instead of a link
  (`{{ .Token }}` in the email template plus a small code box on the sign-in
  screen) — a scanner cannot use up a code.
- Note: creating the test user from the Supabase dashboard with "Create new
  user" (not "Invite user") sends no email and avoids the limit.

### R3-8. An empty result still prints a congratulation  (LOW, cosmetic)
- **Where:** `web/src/app/step/[step]/print/page.tsx`.
- **Reproduced:** with 5.1 empty, the printed page shows the heading, the board
  and the closing words "You have made your picture clearer… and chosen a
  Working Direction". The "Nothing written yet" note is `print:hidden`, so on
  paper nothing says the page is empty.
- **Fix idea:** leave the closing words out until the result page has content.

### R3-2 update
The `boards` store exists and is correctly configured on the live project, so
only the wording half of that finding remains: Supabase's technical messages
("Bucket not found", a row-level-security message, "The source image could not
be decoded" for an iPhone HEIC photo) are still shown to the person as they are.

## What is still unverified
- The admin view with real data, and the "only with consent" branch — both need
  the admin account (`ADMIN_EMAIL`), which this test account is not.
- The feedback stars with a real account (they worked in preview mode).
- Step 2 pages signed in (the workbook itself was walked through in preview).

---

# Round 3 — the fix list for LLM1

Eight findings, in the order I would do them. Nothing here is disputed; all of
it was either reproduced or read straight from the code. Details and evidence
are in the sections above.

| # | What | Severity | Where |
|---|---|---|---|
| R3-7 | Sign-in email: links are used up before the person clicks, and the sender runs out | **High — blocks the pilot** | Supabase settings + `signin/page.tsx` if a code is added |
| R3-1 | Consent screen and privacy page never mention the pictures | Medium — before anyone is invited | `app/onboarding/page.tsx`, `app/privacy/page.tsx` |
| R3-6 | After "Delete everything" people land on the sign-in page, not the confirmation | Low–medium | `app/me/page.tsx:191-192` |
| R3-2 | Picture problems show Supabase's technical message; a HEIC photo fails uncaught | Low–medium | `components/board.tsx:63-64`, `lib/backend/pictures.ts` |
| R3-3 | "Delete everything" leaves pictures when the service key is missing | Low | `app/api/account/delete/route.ts:35-45` |
| R3-8 | An empty result page still prints the closing congratulation | Low | `app/step/[step]/print/page.tsx` |
| R3-4 | 3.5 shows an empty table when all its rows are hidden | Low | `components/fields.tsx` (`Calculation`) |
| R3-5 | A row marked "Unknown" makes the other column's total read "€0 + unknown" | Very low | `lib/money.ts:45` |

**R3-7 in practice:** custom SMTP in Supabase before inviting anyone (GO-LIVE
step), then one real invitation to a Microsoft 365 address, opened by the
person it was sent to. If that link is dead on arrival again, switch the email
template to `{{ .Token }}` and add a six-digit code box to the sign-in screen;
a mail scanner cannot use up a code. For test accounts, use the Supabase
dashboard's "Create new user" (no email, no rate limit) rather than "Invite".

## Please do not re-open these — verified working on the live site
Autosave and reload; the partner's tone, refusals (writing answers, visa and
tax) and saved chat; notes built only from the person's own answers; "Forget
this" hiding the answers behind a note on other pages; corrections and forget
protected while the notes update runs; drafts only from the person's own
answers; picture upload, signed links, removal and storage rules; "Delete
everything" clearing every table, the account and the picture folder; admin
refused for a normal account; a stranger reaching nothing; and one signed-in
person being unable to read or write another's rows.

## Two things for Mwata, not the Engineer
1. Open `/admin` while signed in as `ADMIN_EMAIL` and check a participant who
   has **not** ticked the consent box: progress and feedback should show,
   answers should not. This is the last acceptance check nobody has run.
2. Decide the copyright holder's name and the use line on the printed result
   (already open in PROGRESS.md).

---

# Fixes and rechecks — round 3 (LLM1, 2026-10-01)

Seven of the eight are done. Finding 1 waits on Mwata's SMTP test, because the
answer depends on what that test shows.

| # | Finding | What changed | Checked |
| --- | --- | --- | --- |
| 1 | Sign-in email: Safe Links used the link, and the built-in sender hit its limit | **Open — Mwata first.** Custom SMTP fixes the rate limit but not Safe Links: the scanner opens the link before the person does, and a magic link is single use. If the real invitation to a Microsoft 365 address dies again, the six-digit code is ready to build: the sign-in screen gains a code box, `verifyOtp` replaces the link, and the Supabase email template needs `{{ .Token }}`. About an hour. | — |
| 2 | Consent screen and privacy page never mention the pictures | Both now name them, and the privacy page gained a "Your pictures" section: own folder, no plain link, the AI partner reads only the line under a picture. "Deleting" names the pictures too. | Read on both pages |
| 3 | After "Delete everything" people land on the sign-in page | This page's own "please sign in" guard was overtaking the move to the confirmation page. Now: sign out, then leave with a full page load, which the guard cannot overtake. | Code; needs one live delete to confirm |
| 4 | Picture errors showed Supabase's technical text | Every message goes through one translation (`lib/picture-errors.ts`): the store not switched on, an expired sign-in, a HEIC photo (with what to do about it), too big, no connection. A browser that cannot decode a photo is now caught as a friendly error instead of falling through. | 5 new tests |
| 5 | "Delete everything" left pictures when the service key is missing | The browser deletes the person's own folder first, under their own sign-in; the server deletes again if it can. So the screen's promise holds on both paths. | Code; needs one live delete |
| 6 | An empty result page printed a congratulation | The closing words only print when the page has answers, and "Nothing written yet" now prints instead of being hidden. | Printed view of an empty 5.1 |
| 7 | 3.5 showed an empty table when you have money left over | A calculation whose every row is hidden now renders nothing at all — heading included. | Seeded answers with money left over: the block is gone |
| 8 | A row marked "Unknown" made the other column read "€0 + unknown" | The mark describes the column in front of it ("In my new life"), not what that cost is today. Totals only treat an empty box as unknown in the column the mark is about; the 3.4 confirmed/agreed filter still reads its own column. | 2 new tests, plus 3.2 live: Today €1,000 complete, new life €80 + unknown |

Tests 34/34 (five on the picture messages, two on the totals), typecheck, lint
and the production build all pass.

## Still only Mwata can do these

1. The SMTP test, then one real invitation to a Microsoft 365 address (finding 1).
2. `/admin` as the admin address, on a participant who has **not** ticked the
   consent box: progress and feedback show, answers do not.
3. The copyright holder's name on the printed result.
