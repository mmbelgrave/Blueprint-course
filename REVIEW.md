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
   fine for the pilot, worth remembering later. **Fixed 19 October 2026:** it
   pages 200 at a time through `lib/accounts.ts`, the same walk as
   find-account.ts and the retention sweep, and raises rather than drawing a
   list that is quietly missing people. `tests/admin-paging.test.ts`.
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

---

# Review round 4 — LLM2 (Reviewer), 2026-10-08

Commit `83f4725` (branch main, working tree clean). Mwata named five areas;
this round is those five and nothing else.

## Checks that ran
`tsc --noEmit`, `eslint`, `npm test` (106/106) and the production build: all
pass. All seven content files in `web/src/content` match the project copies.
One script checked every cross-reference in all three steps (63 pages, 258
fields) — three are broken, see R4-8. A second put crafted answers through the
Blueprint rules. A third asked the live database, as a stranger, for every
table. Live probes were made against app.maderealblueprint.com.

## Findings

### R4-1. The whole workbook text is public, to anyone, signed in or not (HIGH)
- **Where:** `src/lib/content.ts` imports all three step JSON files, and client
  components import it, so the content lands in a public browser chunk.
- **Proved on the live site:** with no account and no cookie I fetched the
  sign-in page, followed the scripts it loads, and found Step 3 prose in
  `https://app.maderealblueprint.com/_next/static/immutable/chunks/1u_x0y7t9fqoc.js`
  — Step 3 being the step that is not released at all. Steps 1 and 2 travel the
  same way.
- **Why it matters:** the access layer decides what is *drawn*. The text is the
  product, and it is already in the reader's browser before any door is asked.
  The PDFs are properly shut; the same words inside the app are not.
- **Fix idea:** serve a step's content from the server after the access check (a
  server component, or a checked route like the workbook one), so a browser is
  given only what that person may read. No chunk may carry a step nobody owns.
- **How to check:** repeat the fetch; the paid sentence must not appear in any
  script a signed-out visitor can load.

### R4-2. A video address can be had by writing nonsense in the step (HIGH, before videos go up)
- **Where:** `src/app/api/video/url/route.ts:37` — `if (Number.isFinite(step))`.
- **What happens:** `step` comes from the query. `Number("abc")` is `NaN`,
  `Number.isFinite(NaN)` is false, so the ownership check is skipped entirely
  and the route signs an address for any signed-in person:
  `/api/video/url?video=<id>&step=abc`. A missing step is `Number(null)` = 0,
  which is refused — the hole is specifically a non-numeric step.
- **And:** nothing in the app calls this route. `components/video-slot.tsx`
  plays `video.url` straight from the content, so once real addresses are
  pasted in they ship to every browser (R4-1) and the signing path is unused.
- **Fix idea:** refuse when the step is missing or not a whole number, and have
  the player ask this route for its address instead of reading one from content.

### R4-3. My Blueprint can print a money figure that is wrong (HIGH)
The file says of itself that it "may never say anything that could be wrong".
Two rules break that, both through `total()` (`src/lib/blueprint.ts:37-40`),
which calls `tableTotal` with no options and keeps the value whenever
`filled > 0`.

**(a) An "unknown" is dropped and the rest is printed as fact.** With Step 1
costs of 900 known and two rows marked Unknown, the app's own screen says
*"EUR 900 + unknown — not complete yet"*. The Blueprint prints `Step 1 — EUR
900 — what you thought a month would cost`, then flags *"Your checked costs are
100% higher than your first guess"* against Step 2's 1,800. That 100% is an
artefact of the missing rows.

**(b) Money marked "Hoped" is counted as income they can count on.**
`moneyThread` totals 3.4 without the certainty filter the workbook and the app
both apply. With 1,000 Confirmed and 900 Hoped:

| | the app (3.4 / 3.5) | My Blueprint |
|---|---|---|
| income | EUR 1,000 | EUR 1,900 |
| against checked costs of 1,500 | **500 short each month** | **400 left over** |
| runway on 6,000 savings | 12 months | none reported |

The printed line reads *"Your income covers the month, with EUR 400 left over"*
(`phase/[phase]/print/page.tsx:241-243`), under a column headed *"what you can
count on each month"* (line 214). An adviser reading that page is told the
opposite of the truth.
- **Fix idea:** `total()` should take the options the field carries
  (`total_filter`, certainty column) and return completeness as well, so the
  document can say "EUR 900, three rows still unknown" rather than a bare
  figure — and never build a percentage, a balance or a runway on an incomplete
  side without saying so.
- **How to check:** the current tests pass because every fixture is clean. Add
  one with an Unknown row and one with a Hoped income row.

### R4-4. "Nothing on your list is broken" is printed when nothing was checked (MEDIUM)
- **Where:** `blueprint.ts:210-217`.
- **Reproduced:** two rows in `s3-4.1.check` with an item written and the
  `meets` column left blank produce the green line *"Every must-have and
  dealbreaker you checked is met, or partly met."* Nothing was checked.
- **Fix idea:** say it only when every row with an item also has an answer, and
  name the unanswered ones otherwise.

### R4-5. The Blueprint page asks nothing of the access layer (MEDIUM)
- **Where:** `src/app/phase/[phase]/print/page.tsx` — `RequireUser` and nothing
  else. Every other door asks: the step page, a page inside a step, the step
  print page, the modules pages, and the workbook, video and AI routes.
- The document the website promises buyers opens for any signed-in person,
  including a free account. The data in it is their own, so this is a gate that
  is missing, not a leak.

### R4-6. `video_progress` does not exist in the live database (MEDIUM)
- Asked with the service key: `PGRST205 Could not find the table
  'public.video_progress' in the schema cache`, while `entitlements` and
  `questions` from the same file answer normally.
- So every save from the player returns 500 and "Continue at …" can never work.
  Nobody has noticed because no video has an address yet.
- **Fix idea:** run `supabase/schema.sql` again (it is `create table if not
  exists`) and reload the API schema cache, then save one position to check.

### R4-7. Switching buying on today would shut everyone out, the admin included (MEDIUM)
The `entitlements` table is empty and all four accounts hold nothing.
`NEXT_PUBLIC_REQUIRE_PURCHASE=true` is by design the one switch that takes
access away, so the day it is flipped every existing account becomes a free
account: no workbook, no AI partner, no steps. Grant the entitlements first
(the admin page does it), flip second, and check one account before telling
anyone.

### R4-8. Three copy-from links in Step 3 point at fields that do not exist (MEDIUM)
| On | copies from | where the field actually lives |
|---|---|---|
| `s3-0.1.the_place` | `5.1.place` | `s2-5.1.place` |
| `s3-0.1.still_unknown` | `5.1.unknowns` | `s2-5.1.unknowns` |
| `s3-4.2.question` | `0.1.the_option` | `s3-0.1.the_option` |

They fail silently (`field-extras.ts:76-80` returns nothing when the source is
missing), so "Copy this in" never appears and the person retypes what they
already wrote. Nothing else in the three steps is broken: no duplicate page
ids, no field type the app cannot draw, every other reference valid. Also the
button always says "From your Step 1:", even when the source is Step 2.

### R4-9. The five lights are read from one table only (LOW)
`lights()` reads `green_lights.lights`. Someone who set the light on each of
1.1–1.5 but did not carry them into the summary table gets a Blueprint with
five dashes and no red-light flag, although the answers are one page back. A
fallback to the per-page `*_light` fields would make the document match what
they wrote.

### R4-10. The `free=` branch of the workbook route skips both checks (LOW)
It is taken before either check runs. Safe only because the one item in
`modules.json` is the free exercise; an item added under a paid module would be
handed to anyone signed in. One line fixes it: confirm the id belongs to the
free module before signing. File names are fixed strings, so there is no way
out of the bucket through a name today.

## Concerns (not findings yet)
1. `/api/partner` and `/api/draft` ask "free or paid", not "which step". Today
   every released step sits in Phase 1, so it makes no difference; the day
   Phase 2 opens, a Phase 1 buyer could spend AI on a step they do not own.
   Passing the page's step through `stepFor` is the whole fix.
2. `access.json → free.items` is consulted only by `itemFor`, which no page
   uses for the free module. Harmless, but it reads as if it gates something.

## Verified clean
- **The export route (area 2).** It reads with the person's own session and
  never takes an id from the request, so row-level security decides what comes
  out. Live, as a stranger: every table returned nothing, and writes to
  `entitlements` and `questions` were refused (42501). Every table named in the
  export has an owner-only policy in `schema.sql`, including the new ones.
- **The workbook signing (area 3).** The access check runs before the service
  key is used; file names come from `modules.json`, never from the request; an
  unknown module id or a workbook with no file gives 404. Combinations checked:
  `?step=` together with `?module=`, unknown ids, a step whose file is null.
- No secrets, admin email or AI instructions in the browser files (93 scanned).
- Admin APIs refuse a signed-out caller (403) on the live site.
- Step 3 content: 21 pages, no duplicates, nothing the app cannot render.

## Not done this round
- The two-way check of Step 3 against the Word file. `content-build/
  check-content.mjs` exists, but the workbook text is not in this workspace.
  Engineer: run it and paste the result, or say where the text file lives.
- A signed-in probe with `NEXT_PUBLIC_REQUIRE_PURCHASE=true`. No account holds
  an entitlement, so there is no buyer's side to exercise; the rules were run
  directly instead and behave correctly — a free account gets page 1.2, lesson
  `step-1:p1` and the Introduction, and nothing else.

## The fix list, in order
| # | What | Severity |
|---|---|---|
| R4-1 | The workbook text is public in a browser chunk | High |
| R4-3 | My Blueprint prints incomplete and unconfirmed money as fact | High |
| R4-2 | Video addresses: a non-numeric step skips the check; the route is unused | High, before videos |
| R4-7 | Grant entitlements before switching buying on | Medium, before go-live |
| R4-6 | `video_progress` missing from the database | Medium |
| R4-5 | The Blueprint page asks nothing of the access layer | Medium |
| R4-4 | A green "nothing is broken" on unanswered rows | Medium |
| R4-8 | Three broken copy-from links in Step 3 | Medium |
| R4-9 | Lights read from one table only | Low |
| R4-10 | The `free=` branch of the workbook route | Low |

---

# Review round 5 — LLM2 (Reviewer), 2026-10-09

Commit `a707148` plus one uncommitted change (the workbook dates, and Step 3's
PDF given a file). A full review this time, with two additions: the four issued
workbook PDFs checked against the app's content, and the Lemon Squeezy wiring
now that the test store is connected.

## Checks that ran
`tsc`, `eslint`, `npm test` (142/142) and the production build: all pass. A
script checked every cross-reference across the three steps (70 pages, 291
fields): **no problems** — round 4's three broken links are gone. The four PDFs
were extracted to text and compared with the app content both ways, with the
page furniture filtered out and the near-matches listed separately so a rewrite
shows up as a rewrite. Live probes against app.maderealblueprint.com and the
live database.

## Round 4 — what is fixed
| # | Result |
|---|---|
| R4-1 workbook text public | **Fixed.** The words now live in `content-server.ts` behind `server-only` and are handed out page by page by `/api/content` after the access layer answers. I fetched the signed-out site again: the Step 3 sentence is in none of the scripts it loads. One leftover — see R5-5. |
| R4-2 video address | **Fixed** for the hole: a step that is not a whole number is now refused. Still open: nothing calls `/api/video/url`; `video-slot.tsx` plays `video.url` from the content. Lower risk now that content is gated, but the address itself is unsigned, so it can be passed on. |
| R4-3 money printed as fact | **Fixed,** and correctly. `total()` takes the certainty column and the filter, and a percentage, a balance and a runway are all withheld while anything is incomplete. The content's filter (Confirmed + Agreed) matches the issued Step 1 workbook: *"Confirmed and agreed income goes into the check in 3.5. Hoped income stays out of it."* |
| R4-4 false "nothing is broken" | **Fixed.** A blank `meets` no longer produces the green line. |
| R4-5 Blueprint page ungated | **Fixed.** It now prints only the steps `stepFor` opens. |
| R4-6 `video_progress` missing | **Fixed.** The table exists. |
| R4-7 entitlements before the switch | **Done.** Two accounts hold `phase1`. |
| R4-8 broken copy-from links | **Fixed.** Zero broken references, and the label now names the right step. |
| R4-9 lights from one table | **Open.** Still read only from `green_lights.lights`. |
| R4-10 `free=` branch | **Open.** Unchanged. |

## New findings

### R5-1. The Blueprint's runway is too long, by the cost of the move (HIGH)
- **Where:** `src/lib/blueprint.ts:157` — `savings` comes from
  `s3-0.1.savings_reachable`, whose label is *"Savings I can use within a
  month"*.
- **What the workbook says:** Step 3's money check runs down a column —
  savings, minus the cost of deciding, minus the one-time cost of the move,
  minus deposits, minus the reserve, minus the return fund — ending at *"Savings
  left to live on"* (`s3-1.1.check_one`, row 7). The runway is that last figure
  divided by the monthly shortfall: *"If short: how many months my savings left
  to live on can cover (my runway)"*.
- **What the app does:** divides the **first** figure by the shortfall, and
  prints *"which your savings cover for about N months. That is your runway if
  nothing changes"*, with the same number as the headline tile.
- **The size of it:** savings 20,000, move and reserve 13,000, short 500 a
  month → the workbook's runway is 14 months, the Blueprint prints 40.
- **Fix idea:** read `check_one` row 7 when it is filled — it is a money column,
  so it is already a number — and fall back to the Start figure only with
  wording that says it is before the costs of the move. Step 3 also asks for
  *"The runway I want, in months (my choice)"* (`check_two`, row 6) and defines
  the money light as the runway reaching it, *counting confirmed income only*.
  That is the one comparison the workbook spells out, and the document does not
  make it; both lines side by side would.

### R5-2. The app promises videos the workbooks say are not part of the course (HIGH)
- **The app**, Step 1 overview: *"Three ways to use this step … With the videos
  — Each part has a short video where I explain the same ideas in my own words.
  Watch first, then answer the questions."*
- **The issued Step 1 workbook:** *"Two ways to use this step … Videos are
  planned; they are not part of this course yet."*
- **The issued Introduction:** *"Videos (planned). I am preparing videos that
  talk through the same ideas. They are not part of this course yet; everything
  you need is in the workbooks."*
- No video has an address anywhere in the content, and Phase 1 is on sale now.
  A buyer reads the app, expects a video on every part, and finds none — while
  the workbook they also received says the opposite.
- **Fix idea:** put the app's `ways_to_use` back to the workbook's two ways
  until a video exists, and check the Modules wording says "being recorded"
  rather than promising one per part.

### R5-3. A test order is still opening the live course (MEDIUM — today)
`webhook_events` row 1: `order_created`, `test_mode: true`, outcome **opened**,
`phase1` for info@belgraveconsultancy.com, 9 October 13:29. So
`ALLOW_TEST_ORDERS` is still set in production. GO-LIVE §"Try it before you
trust it" already says to take it out again, and this is the reminder: while it
is on, anyone who gets a test checkout link can open the real course with a
published test card number.

### R5-4. The buyer lookup stops at 200 accounts (MEDIUM — later, but silent)
- **Where:** `api/lemonsqueezy/webhook/route.ts:187` — `listUsers({ page: 1,
  perPage: 200 })`.
- Past 200 accounts an existing buyer is not found, so the webhook tries to
  create their account, Supabase refuses the address, the second lookup fails
  the same way, and the handler throws. Lemon Squeezy then retries a 500
  forever and that person never gets in — with the money taken.
- **Fix idea:** page through the list, or look the address up in `profiles`,
  which is indexed and cheap.

### R5-5. Round 4's public copy of the workbook is still being served (MEDIUM)
The fix changed what new builds ship, but Vercel keeps the files of earlier
deployments. The exact address from round 4 still answers 200 today and still
contains Step 1 and Step 3 prose:
`/_next/static/immutable/chunks/1u_x0y7t9fqoc.js` (195 KB). Deleting the old
deployments in Vercel is what actually removes it.

### R5-6. Two small things in the claim flow (LOW)
- When there **is** a purchase on the address but the email fails to send, the
  answer is a different message (502) from the usual one. That tells the caller
  the address has bought the course — the one thing the two identical answers
  are there to hide.
- Nothing limits how often a code can be asked for. Somebody signed in can send
  repeated code emails to an address that has a purchase. A short cooldown per
  address would close both.

### R5-7. Two wording slips against the issued workbooks (LOW)
- Step 3 overview: the app says *"the real costs you **created** in Step 2"*;
  the workbook says *"the real costs you **found** in Step 2"*. Found is the
  true one — you do not create a real cost.
- Step 3: *"complete a short summary"* became *"complete a summary"*.

## The workbooks against the app
Method: each PDF to text, then compared with its content file both ways —
prose sentences only, page headers and copyright lines dropped, and anything
that merely looked different compared again as a near-match so rewrites would
stand out from reformatting.

**Verdict: the app carries the workbooks faithfully.** Nearly every difference
is structure rather than substance — tables flattened into lines, "Word help:
must-have:" losing its colons, "Made-up example (Sofia, 51):" becoming
"Sofia, 51", and the deliberate adaptations the content files already record
("this workbook" → "this step"). Out of roughly 170 near-matches across the
three steps, exactly three carry a difference in meaning, and they are R5-2 and
the two slips in R5-7. Nothing in the app is invented: every exercise,
question, example and rule I checked traces back to the issued PDF. The five
PDFs in the private store match the files sent today, by size and date —
step-1 1.03 MB, step-2 0.57 MB, step-3 0.49 MB, introduction 1.08 MB, plus the
free exercise.

## Lemon Squeezy — reviewed, and sound
- The signature is checked against the raw bytes before anything is read, with
  a length check and a timing-safe comparison, and each configured secret is
  tried so the mode is learned from the one that matches.
- A live order signed with the test secret, or the other way round, is refused.
- The same order cannot count twice: the unique index on `order_id` is what
  enforces it, and `23505` is read as "seen before" rather than as a failure.
- Every message is written to `webhook_events`, including the ignored ones.
- A refund sets the entitlement to `refunded` and ends it.
- The claim flow is careful: the code is hashed with the address mixed in, five
  attempts, an expiry, one use, and the move is a move — the paying account is
  left with nothing. Step 1 answers the same sentence whether or not there is
  a purchase (apart from R5-6).
- A strangers' probe of the live database still returns nothing from any table,
  and writes to `entitlements`, `questions` and `webhook_events` are refused.

## Not done this round
- A signed-in walk-through with buying switched on. The flag is in Vercel, not
  in the local file, and both accounts now own Phase 1, so there is no
  unentitled buyer's view to exercise from here. The rules themselves were run
  directly in round 4 and are unchanged.
- The admin view with real data, and the "only with consent" branch. Still only
  Mwata can do that one.

## The fix list, in order
| # | What | Severity |
|---|---|---|
| R5-2 | The app promises videos the workbooks say are not included | High — people are buying now |
| R5-1 | The Blueprint's runway ignores the cost of the move | High — the document goes to advisers |
| R5-3 | `ALLOW_TEST_ORDERS` is still on in production | Medium — today |
| R5-5 | Round 4's public chunk is still served from an old deployment | Medium |
| R5-4 | The buyer lookup stops at 200 accounts | Medium — before 200 people |
| R5-6 | The claim flow leaks "this address bought" when email fails; no cooldown | Low |
| R5-7 | Two wording slips against the issued workbooks | Low |
| R4-9 | Lights still read from one table only | Low |
| R4-10 | The `free=` branch still skips both checks | Low |

---

# Review round 6 — LLM2 (Reviewer), 2026-10-16

The partner seat: `5ced2e8`, `75bac23`, `b71674e` on main, read against
`REVIEW-BRIEF-partner-seat.md`, `PROJECT.md` §6.8 and `design/partner-seat.md`.
Both migrations are on the live database. Nothing was edited.

## Confirmed

### R6-1. The browser decides "shared or mine" from a household it asks for last (HIGH)
- **Where:** `src/lib/app-state.tsx:180-184` (the order), `:228` (the decision),
  `:138-147` (`applyHousehold`), `src/lib/household-client.ts:45-53`
  (`fetchHousehold`).
- **What is wrong:** the app loads everything, *then* asks `/api/household`:
  `loadEverything().then(apply).then(() => applyHousehold())`. Until that
  second request returns, `household.role` is `"alone"`. `setAnswer` decides
  per keystroke — `const shared = household.role !== "alone" && sharedAnswer(...)`
  — so an answer typed in that window is sent to the person's own rows instead
  of through `/api/household/answer`. And `fetchHousehold` turns **every**
  failure into `null` (a 503 with no service key, a 500, a cold start, a
  dropped connection), after which `applyHousehold` returns early and the role
  stays `"alone"` for the rest of the session. The save succeeds against the
  person's own rows, so the indicator says **Saved**.
- **Impact, the partner:** their half of the money table lands on their own
  rows. The buyer never sees it. On the next load the household's shared
  answers are laid over the top (`app-state.tsx:150-156`), so the work
  disappears from the screen with nothing said.
- **Impact, the buyer — this is promise 5:** an answer written in that window
  is stored with `changed_by` null. `conflict()` (`src/lib/household.ts:100-105`)
  reads a null `changed_by` as "not theirs" and returns `{kind:"none"}`, so the
  partner's next save on that field **overwrites it with no question asked**.
  The promise is that nothing is overwritten silently; this is a path where it
  is.
- **Evidence:** the three lines above, plus `tests/household.test.ts`, which
  exercises `conflict()` only with a `changed_by` present — the null case is
  tested as "my own earlier writing", never as "written moments ago during the
  window".
- **How to check a fix:** (a) with a partner account, block `/api/household` in
  the browser's network tab, type into 3.2, and confirm the save is refused and
  retried ("Not saved yet…") rather than written locally; (b) with both
  accounts, have the buyer type into 3.2 within a second of opening the app,
  then have the partner save the same field, and confirm the partner is asked
  which answer to keep.

### R6-2. A person who matches two seat rows silently becomes "alone" (MEDIUM)
- **Where:** `src/lib/household-server.ts:19-26`. `seatOf` asks
  `.or(buyer_id.eq.X,partner_id.eq.X).maybeSingle()` and destructures `{ data }`
  only, so the error is dropped.
- **Reproduced, on the live database:** the same shape over several matching
  rows returns `data: null` with `PGRST116 "JSON object requested, multiple (or
  no) rows returned"`. A dropped error therefore reads as "no seat", which
  `householdFrom` turns into `alone`.
- **How somebody gets two rows:** nothing ends a seat when a purchase is
  refunded. `ended_reason: 'refund'` is named in the migration, but the only
  code that ends a seat is `src/lib/forget-account.ts:44`, on account deletion.
  So: A buys and invites B; A is refunded; A's seat row stays `active`; C may
  now invite A, because the guard at `src/app/api/seat/route.ts:109-116` refuses
  only an address holding an **active** entitlement. A is then buyer on one row
  and partner on another. Both households vanish for A, who sees the app as a
  free account with nothing explaining it.
- **How to check a fix:** write the two rows by hand in SQL, load the app as
  that person, and expect the seat to be read — the buyer row winning — rather
  than nothing. Ending the seat on refund would also close the path.

### R6-3. Keeping a page private is one-sided (LOW–MEDIUM, and it may be a decision)
- **Where:** `src/lib/together.ts:67-73`. `mayCompare` takes `theirsPrivate` and
  not `minePrivate`, and `comparePage` returns `minePrivate` for the UI only.
- **What happens:** I mark 2.3 private, we both write it, and I see your 2.3
  while you are told only that mine is private. The design
  (`design/partner-seat.md:30-33`) says private is "set by the person who wrote
  it" and never unlocks itself; it does not say whether it should also close the
  page in the other direction.
- Not reported as a defect, because it may be what was meant. If it is, the
  panel should say so plainly to the person holding theirs back.

## Concerns, not run
1. **`writeShared` reads then writes with nothing between them**
   (`household-server.ts:113-136`). Two saves inside the same instant can both
   pass the conflict check and the second wins. Sub-second window, no
   transaction.
2. **`force` cannot be undone.** Pressing "Keep mine" overwrites; the replaced
   answer is not kept anywhere, and `changed_by`/`updated_at` simply move. That
   is attack 5's open question: nothing else stops it, and nothing recovers it.
3. **A refund leaves the seat open.** The partner loses access (entitlements are
   read live, promise 6 holds), but the row stays `active`, the address stays
   locked by `partner_seats_email`, and Admin lists a live seat for a refunded
   purchase.
4. **`/api/household/compare` POST does not ask whether the caller is in a
   household**, so a person alone can write a `private_pages` row. Harmless, but
   it is the one new route that opens without that question.
5. **Invitations can be re-sent to the same address without limit**
   (`seat/route.ts`), which is deliberate for "it never arrived" and also means
   a buyer can mail-bomb that one address.
6. **The partner's first save can race the seat flip.** Only `/api/household`
   calls `joinAndRead`; the answer, status and compare routes use `householdOf`,
   which does not flip `invited` to `active`. A save landing before the first
   household load is refused 403 until the flip. It self-heals through the
   retry, but it will look odd in the logs.

## Promise by promise
| # | Promise | Verdict |
|---|---|---|
| 1 | A partner cannot read the buyer's personal answers | **Holds in the code.** `sharedState` filters every row through `sharedAnswer`, RLS on `answers` is untouched, and the filter's data matches the content (checked below). Not exercised by a second signed-in session. |
| 2 | Nothing of theirs until both have written | **Holds.** `comparePage` sets `theirs: may ? theirs : null`; `compareStep` carries booleans only; `ComparePanel` returns before rendering when `!state.may`. |
| 3 | A private page stays private | **Holds.** `setPrivate` refuses anything outside 2.3/2.4/3.1; `private_pages` is own-rows-only and refused writes from the public key. See R6-3 for the one-sidedness. |
| 4 | The AI never sees the other person's personal answers | **Holds.** `answersIMaySee` is used by all three AI routes (`partner:87`, `draft:67`, `profile:35`) and adds only `sharedState`. |
| 5 | Nothing is overwritten silently | **Broken on one path — R6-1.** The conflict machinery itself is right. |
| 6 | A refund ends the partner's access at the same moment | **Holds** for access; the seat row outlives it (concern 3). |
| 7 | No swapping | **Holds** as far as the indexes and refusals go; R6-2 is the case they do not cover. |
| 8 | A person alone sees no change | **Holds.** All four new components return null when the role is alone, and with no seats on the live database `/api/household` answers `{role:"alone"}`. |

## Checks that ran
- `tsc --noEmit`, `eslint`, `npm test` (215, including the 31 new), `next build`
  with the five new routes: all pass, as the brief said.
- `content-build/check-together.mjs`: 69 pages, 29 mine, 37 ours, 3 read.
- **`together.json` against the real content** (my own script, because this is
  what keeps promise 1 honest): every `mine_fields` id exists on its page
  (`s3-2.2.biggest_fear`, `s3-5.3.my_choice_hours`, `s3-5.3.blocks_back`,
  `s3-5.4.what_i_need`); all three private pages are `mine`; both `agree_after`
  pages are `mine`; and **no real field anywhere is called `agreed`**, so the
  reserved shared field cannot collide with a personal answer.
- Live, signed out: `/api/household`, `/api/household/compare` (GET and POST),
  `/api/household/answer`, `/api/household/status`, `/api/seat` (GET and POST)
  all answer 401.
- Live, with the public key: `partner_seats` and `private_pages` exist, hold no
  rows, return nothing and refuse writes (42501). `answers.changed_by` exists.
  These were the first real queries against both tables.
- The `maybeSingle()` behaviour behind R6-2, reproduced against live data.

## The two-account run (added the same day)

Mwata asked for the gap to be closed and gave access to the live household:
**Renata** (buyer, holds Phase 1) and **info@belgraveconsultancy.com**
(partner, seat active, joined 11:37). I drove the partner's own signed-in
session in Chrome and set the buyer's side up with the service role. The buyer
was seeded with two personal answers marked `REVIEW-SECRET` and one shared one.
**Everything written for the test was deleted afterwards**: both accounts are
back to 0 answers, 0 statuses, 0 private pages, the entitlement is `active` and
the seat is untouched.

### R6-4. The partner cannot open anything they have paid to see (HIGH — this stops the feature working)
- **Where:** `src/app/api/content/route.ts:43` uses `myEntitlements(supabase)`
  and never calls `householdEntitlements`. The same is true of
  `api/workbook/route.ts:60` and `api/video/url/route.ts:38`.
  `householdEntitlements` is used in exactly one place: `/api/household`.
- **What happens, on the live site, as the partner:**

  | Asked for | Answer |
  | --- | --- |
  | `/api/household` | `role: partner`, entitlements `[{phase1, active}]` |
  | `/api/content?page=3.2` (shared money page) | **403** "This page is part of the course." |
  | `/api/content?page=1.4` (personal page) | **403** |
  | `/api/content?step=1` | **403** "This step is part of the course." |
  | `/api/content?page=1.2` (free page) | 200 |
  | `/api/workbook?step=step-1` | **403** |
  | `/api/video/url?...&step=1` | **403** "This video is part of the course." |

- **What the partner sees:** opening `/step/1/p3/3.2` gives the closed-step
  screen — *"Step 1 · Picture is part of the course. What life do I really
  want? Get Phase 1 to open it, with its video and its workbook"* — with a
  **Get Phase 1** button, to somebody who is already on a paid seat. The
  household route tells the browser the step is owned; every door that hands
  over words, PDFs or video says no. The seat works for shared answers and for
  nothing else.
- **Why the unit tests missed it:** `householdEntitlements` is tested on its
  own and is right. Nothing tests that the routes which gate content ask it.
- **How to check a fix:** as the partner, `/api/content?page=3.2` returns the
  page, `/api/workbook?step=step-1` returns the PDF, and `/step/1/p3/3.2`
  renders the money table rather than the sales screen.

### R6-1, reproduced on the live site
The silent overwrite in promise 5 is real, and it took two minutes to produce:

1. Renata's `3.2 / costs` was written with `changed_by` recorded — exactly what
   the app does once a household exists. The partner then saved the same field
   with a ten-minute-old `loadedAt`: **`saved: false`**, both answers returned,
   "Renata" named. The conflict machinery is right.
2. The same field was then written with `changed_by` **null** — which is what
   the startup window in `app-state.tsx` produces, because the role is still
   `"alone"` until `/api/household` returns. The partner saved it again with
   the same stale `loadedAt`: **`saved: true`**, no question, and Renata's
   answer was gone. `/api/household` afterwards returned the partner's value.

So the promise holds whenever `changed_by` is set, and fails for any answer
written before the household arrives — including every answer written by a
buyer in the seconds after they open the app.

### R6-3, reproduced on the live site
As the partner I kept 2.3 private and then asked for the comparison:
`minePrivate: true`, `may: true`, and Renata's 2.3 handed over in full. From
her side the same page gave `may: false`, `waiting: "theirs-private"`,
`theirs: null` and no trace of my words. Private holds in the direction it is
meant to; it just does not close the page in the other direction.

### The attacks that passed, live
| # | Attack | Result |
| --- | --- | --- |
| 1 | Partner asks Supabase directly for the buyer's `answers` | 0 rows. Every row the partner's own session can read belongs to them. |
| 2 | Compare 1.4 before writing mine | `may: false`, `theirs: null`, no words in the body — `theirsWritten: true` only, which is the design. |
| 3 | Compare a shared page (3.2) | 400, refused. |
| 4 | Write a personal field through `/api/household/answer` | 400 "That answer is not a shared one", nothing written. |
| 5 | `force: true` having never opened the page | Saves, as designed. Nothing else stops it and the replaced answer is not kept. |
| 10 | Partner keeps 2.3 private; buyer opens 2.3 | Buyer gets `theirs: null`, told it is private. |
| 11 | Keep 1.4 private | 400, refused. |
| 12 | Read the buyer's `private_pages` directly | 0 rows. |
| 13 | Two people on one money field | Asked, not overwritten — see R6-1 for the null case. |
| 14 | Shared page marked done | Saved for the household; a personal page's status is refused (400). |
| 17 | Buyer's entitlement set to `refunded` | Partner lost the paid content immediately; restored to `active` straight after. |
| 18 | What the AI partner is given | Pages 1.4, 2.3, 3.2 — their own two plus the shared money table. **No `REVIEW-SECRET` anywhere**: the buyer's personal answers never enter the context. |

### Still not run
Attacks 7, 8 and 9 (the invitation refusals) need the buyer's session to POST
`/api/seat`, which I did not have. Attacks 15 and 16 delete accounts, so they
were read rather than run. The twenty-second poll, the invitation email and the
"You and Ben" card with real data are still untried — and the card could not
appear anyway while R6-4 stands.

## The fix list, in order
| # | What | Severity |
|---|---|---|
| R6-4 | The partner is refused every paid page, workbook and video: the content, workbook and video routes ask only that person's own entitlements | High — the seat does not work |
| R6-1 | Shared answers can be written to the wrong rows, and an answer written before the household loads is overwritten with no question (both reproduced live) | High |
| R6-2 | Two seat rows read as "no seat"; a refund never ends the seat | Medium |
| R6-3 | Private is one-sided — reproduced live; decide, then say so | Low–medium |
| C1–C6 | The six concerns above, none of them urgent | Low |

Promise 5 ("nothing is overwritten silently") and the working seat itself are
the two that are not kept. The other six hold, and seven of them were tried
against the live household rather than read.

## Round 6 — what is fixed (16 October 2026)

LLM1's answer to the round 6 findings. All four are fixed, and so are five of
the six concerns that were raised but not run.

### R6-4. The seat opened no doors (HIGH, confirmed live)

The worst of the lot, and the review found it where the tests could not: the
unit tests exercised `householdEntitlements`, and nothing exercised whether the
doors asked it. `/api/content`, `/api/workbook` and `/api/video/url` asked
`myEntitlements`, which is that person's own purchases, so a partner sitting on
a paid seat was told "This page is part of the course".

- **Fixed** by one function with one name, `myAccess(supabase, userId)` in
  `access-server.ts`: a person's own entitlements, widened by the seat they
  sit on. Five routes now ask it: content, workbook, video, draft and partner.
- `/api/seat` deliberately still asks the narrow question, with a comment
  saying why: a partner may not pass the seat on to a third person.
- **And a test that would have caught it**: `web/tests/gates.test.ts` reads the
  route files and fails if a door asks `myEntitlements`, or reads the
  entitlements table behind the access layer's back. A rule nobody calls is
  worth nothing, so the test is about the call sites, not the rule.
- While fixing this I found a second ordering bug of my own making: the
  household and the person's own rows were loaded in parallel and applied in
  whichever order they arrived, so a partner's merged entitlements could be
  wiped by their own empty list a moment later. The two requests still leave
  together, but they are now applied in order.

### R6-1. The startup window, and answers with nobody's name on them (HIGH, confirmed live)

Two bugs behind one finding, and the review confirmed the dangerous half live:
with `changed_by` null, a stale save went straight over the other person's
answer and reported success.

- **Where an answer belongs is now decided when it is sent**, not when it was
  typed. The latest household lives outside React (`household-client.ts`), the
  saver asks it at send time, and `null` means "not known yet", which is not
  the same as "alone": the answer stays in the queue, the page keeps saying it
  is not saved, and the saver tries again. A household request that fails is
  retried every five seconds instead of settling into "alone" for the session.
- **`conflict()` no longer reads a nameless answer as mine.** Everything
  written before seats existed is older than the page load and is already let
  through by the timestamp check. What is left is an answer that appeared while
  the page was open and cannot be accounted for, and that now asks.
- The two loads start together, so the unknown window is as short as the slower
  of the two requests rather than one after the other.

### R6-2. One seat row too many, and a seat that outlived a refund (MEDIUM)

- `seatOf` no longer asks for a single row and swallows the error. It takes up
  to five, raises a real error, and resolves more than one rather than guessing:
  a person's own purchase governs their shared answers, an active seat beats an
  unused invitation, and a warning goes to the log so the ambiguity is visible.
- Every caller fails closed. `/api/household` turns a seat it cannot read into
  503, the browser keeps the household unknown, and shared answers wait.
- **The root cause is gone too**: the Lemon Squeezy webhook now ends the seat
  when it refunds an order, with `ended_reason: 'refund'`, and says so in the
  admin log. Access already followed the buyer, so nobody kept access they
  should not have, but the row left standing was what made two rows possible.
- The invitation guard now refuses an address that belongs to another household
  **as a buyer as well as a partner**.

### R6-3. Privacy was one-way (LOW-MEDIUM, confirmed live)

Mwata's call, and the decision is **mutual**: a page you keep to yourself is
closed both ways. It is the only version that can be said in one line, and the
alternative reads as taking without giving. `mayCompare` takes `minePrivate`,
the page says "You are keeping this page to yourself, so it is closed both
ways. Untick it below to compare", and both the page view and the step view
answer the same way.

### The concerns that were not run

- **The read-then-write gap in `writeShared`** is closed. The update carries the
  timestamp it expects to find, so a write that slid in between finds nothing
  to update and comes back as a clash. A first answer uses an insert, which
  fails on the primary key rather than overwriting.
- **"Keep mine" is recoverable.** The other answer stays on the page until it is
  left, with "Use theirs after all" and "Put mine back".
- **Unlimited re-invites**: the same invitation can be sent again after five
  minutes, not every time somebody presses the button.
- **The route that did not ask about the household** (keeping a page private)
  now asks.
- **The first-save-versus-seat-flip race** is answered by the R6-1 fix: a save
  that arrives before the household is known waits in the queue.

### Still open after this round

- The two-account test is Mwata's to run: nothing here has been exercised by a
  second person since these fixes.
- R4-10 is **fixed** (19 October 2026): `freeItemById` now searches only
  modules of the free kind, so an exercise added under a paid module cannot be
  handed out by `/api/workbook?free=`. `web/tests/free-pdf.test.ts` holds the
  rule, since the route takes that branch before any access check runs.
- R4-9 is **fixed** (19 October 2026): `lightsOf` falls back to the light on
  each of 1.1 to 1.5 where the summary row is empty, row by row, so somebody
  who answered the pages and never copied them forward gets their own colours
  instead of five blanks. The summary still wins where it was filled in.
  Checked on the printed page with the summary table deleted.
- R5-5 is **closed** (19 October 2026): the address from round 4 now answers
  410 Gone, so Vercel has expired that deployment's files. The current public
  bundle was fetched from the live site and checked against 12 passages of
  teaching text from all three steps: none of them is in it. Page titles are,
  which is the spine and is public by design. `web/scripts/check-public-bundle.mjs`
  now runs after every build, Vercel's included, so a leak fails the deploy
  instead of waiting for a review. It was proved against the server build,
  where the prose does live, and finds it there.
- The admin overview asking for 1000 accounts in one call is **fixed**
  (19 October 2026); see concern 3 of round 4.
- (was R5-5: an old public chunk
  may sit in an edge cache), and the admin overview asking for 1000 accounts in
  one call.
- Slice 3: two voices in the result documents.

**Checked after**: 223 tests (including the new gate tests and the rewritten
conflict tests), typecheck, lint, and a production build with all five routes
in it.

# Review round 7 — LLM2 (Reviewer), 2026-10-19

`git diff b71674e..HEAD` on main (152 files, 10,539 insertions, 892 deletions — the brief rounds this to 151 and ~10,350),
read against `REVIEW-BRIEF-round-7.md`, the three migrations in `web/supabase/`
and the three workbooks in `Belgrave, M.M/My Purpose/`. The app is live and all
three migrations are on the live database, so **§ Needs a migration or a hand
repair** below is kept separate from the code findings.

Nothing was edited. Everything I measured was measured against a local preview
on throwaway fixtures outside the repository; the one script I ran against a
modified content file ran against a copy in a scratch folder, not against
`step3-content.json`.

Where the brief says "I wrote both, so check them", I checked them. Two of
LLM1's beliefs are right, one attack lands harder than he expected, and the
two findings I would act on first are not on his list at all.

## Confirmed

### R7-1. Anybody can end a stranger's access by typing their email address, and the sweep then deletes their account (HIGH)

- **Where:** `src/app/api/withdraw/route.ts:133` (POST, no session required),
  `:166-168` (the address typed wins over the session), `:224` and `:250-251` (the row,
  then `entitlements.ended_at`), `src/app/api/retention/route.ts:217-229`
  (`delete-data`), `src/lib/withdrawal.ts:329-346` (`sweepActs`).
- **What happens:** an unauthenticated `POST /api/withdraw` with a body of
  `{"email":"someone@else.com"}` is accepted. Nothing proves the sender owns
  that address. If the address belongs to an account with an active purchase,
  the route writes `entitlements.ended_at` three days out (`:251`), and the
  access rules (`src/lib/access.ts:42-43`) then refuse that purchase from the
  third day on. Thirty days after that, the daily sweep's `delete-data` branch
  deletes the whole account — answers, pictures, chats, notes — on day 33.
- **Why the design does not stop it:** three defences exist and none of them
  stops the first request, which is the one that does the damage. The
  confirmation email goes to the victim, who has three days to notice it and
  reply; the "one open request per address" rule (`:173-190`) then works for
  the attacker, because the victim's own request returns the `already` branch
  and writes nothing; and the per-address limit of five a day is keyed on an
  address the attacker chooses.
- **This is not promise 3's fault.** "A withdrawal is never refused" is right,
  and the row should still be written for anything that arrives. What does not
  have to follow from an unverified request is the write at `:251`. A signed-in
  owner's request can end access immediately; a public one can write the row,
  send the letter, and leave `ended_at` null until either the owner confirms
  through a link in that letter or Mwata matches it by hand — which is already
  what happens to every public request that matches nothing.
- **How to check a fix:** signed out, `curl -X POST /api/withdraw` with a real
  customer's address, then read that customer's `entitlements` row. Expect
  `ended_at` still null, a withdrawal row present, and the letter sent.

### R7-2. Undoing a withdrawal by hand does not survive the next sweep, and the account is deleted anyway (HIGH)

- **Where:** `src/app/api/retention/route.ts:155-160` (every row that is not
  `cancelled`, every day, forever), `:203-213` (`revoke`), `:217-229`
  (`delete-data`), `src/app/api/admin/entitlements/route.ts:40` (the repair
  button), and nothing anywhere that writes `withdrawals.status = 'cancelled'`.
- **What happens:** the withdrawal letter says "If you did not make this
  request, reply to this email and we will stop it." The tool for stopping it
  is the admin entitlements route, which sets `status: "active", ended_at:
  null`. That repairs access — until the next sweep. The sweep re-reads the
  withdrawal row, sees `access_ends_at` in the past, sets the entitlement back
  to `revoked`, and once 30 days have passed since `access_ends_at` runs
  `delete-data` in the same pass. The "bought again" guard at `:227` reads the
  entitlement rows *after* that same run's revoke, so it sees `revoked`,
  `counts()` is false, and `deleteEverything` runs.
- **Impact:** the only correct repair is `update withdrawals set status =
  'cancelled'` in SQL. There is no button for it — the admin board lists
  withdrawals read-only (`src/app/admin/page.tsx:554`). Somebody who presses
  the button that looks like the repair will believe they fixed it and lose the
  person's account a month later.
- **Severity:** high because it is silent, delayed, and destroys data that
  cannot be restored (the privacy pages say truthfully that there are no
  backups).
- **How to check a fix:** with a test account, file a withdrawal, restore the
  entitlement with the admin route, then run `/api/retention?dry=1` and expect
  no acts for that row. A `cancelled` status written by the same repair, or a
  sweep that skips a withdrawal whose entitlement is active again, both close
  it.

### R7-3. The `already` branch tells a stranger whether an address bought the course (MEDIUM — this is promise 4)

- **Where:** `src/app/api/withdraw/route.ts:173-190`.
- **What is wrong:** the branch returns `requestedAt`, `accessEndsAt` and
  `refundDeadline` to whoever asks, signed in or not. `accessEndsAt` is
  non-null only when the address matched a purchase that was still active
  (`:224`). So a caller who files one withdrawal for an address and then files
  a second learns, from `accessEndsAt` being a date rather than null, that the
  address holds a real purchase. The file's own header says the opposite: "The
  screen a stranger sees never says whether the address matched a purchase."
- **It is also outside the rate limit.** The branch returns at `:183`, before
  the counting at `:192-207`, so it can be polled without limit.
- **Fix:** return the same neutral shape as a first public request —
  `{requestedAt, refundDeadline, emailed}` and nothing about access — and keep
  the dates for the signed-in branch, which already knows who it is talking to.
- **How to check:** signed out, POST the same address twice and diff the two
  JSON bodies. They should be indistinguishable.

### R7-4. A mover who has not named a place loses the three sheets they filled in (MEDIUM — this is attack 5)

- **Where:** `src/lib/report.ts:555-561` (`movingWritten`),
  `src/components/report/step2.tsx:44-45` (`movingSheets`, `of`).
- **What is wrong:** `movingWritten` looks at five things — `s2-5.1.place`,
  `s2-5.1.choice`, and the row tables of `s2-1.2`, `s2-2.3` and `s2-3.1`. The
  three moving sheets read far more than that: the hub of travel times comes
  from `s2-3.3.daily` (`:509-517`), and `monthlyCost`, `incomeThere`, `legal`,
  `unknowns`, `nextStep` and `reviewWhen` all come from other fields of
  `s2-5.1` (`:562-567`). None of those six counts as "written".
- **Measured, in the preview:** two fixtures identical except for one field.
  Both have the daily-life check filled in (hospital 25 min, work 20 min, shops
  8 min, airport 1 h 10), the legal check, the monthly cost, the income, the
  unknowns and the next step, plus staying answers on S1 to S7.

  | `s2-5.1.place` | sheets printed | what is on them |
  | --- | --- | --- |
  | empty | 2 | the staying summary only |
  | `"Central Portugal, near Tomar"` | 5 | the hub, "What I learned here", "The next checks", then the staying summary |

  The person in the first row wrote everything the person in the second row
  wrote. Three sheets of it are simply not printed, and the footer says 01 / 02,
  so nothing on the page suggests anything is missing.
- **Who hits it:** somebody who has done the research but has not settled on a
  place — which is the ordinary state of a Step 2 reader — and who also looked
  at the staying path. The staying content is what flips `extra` to 2 and lets
  `movingSheets` go false.
- **Fix:** decide it from what the sheets actually read. `movingWritten` should
  be true when any of `spokes`, `countries`, `regions`, `guess`, `found`,
  `income`, `monthlyCost`, `incomeThere`, `legal`, `unknowns`, `place` or
  `choice` has something in it.
- **How to check:** the two fixtures above, or in the app: fill 3.3 and the
  money boxes of 5.1, fill S1, leave 5.1's place empty, and print Step 2.

### R7-5. Long answers run past A4 on two Step 3 sheets, and the splitting rule cannot help (MEDIUM — this is attack 4)

- **Where:** `src/lib/report.ts:672-682` (`changePlanHeight`,
  `changePlanSheets`), `src/components/report/change-plan.tsx:32-95` (what the
  split moves), `src/components/report/step3.tsx:173-209` (sheet four, which
  has no rule at all).
- **Measured:** every sheet's own `offsetHeight` against the A4 box of 1123px,
  in the preview at a 1280×1400 viewport (the same box the project's print
  script uses).

  | Step 3 sheet | Sample B | long answers |
  | --- | --- | --- |
  | 1 the decision | 1123 | 1123 |
  | 2 money | 1123 | 1123 |
  | 3 risk and a way back | 1123 | 1123 |
  | 4 the order I will do this in | 1123 | **1212 (+89)** |
  | 5 my change plan (1 of 2) | 1123 | **1205 (+82)** |
  | 6 what it rests on (2 of 2) | 1123 | **1130 (+7)** |

  Sample B is exactly 1123 on all six, which is what LLM1 measured and is
  correct. The long fixture uses five timeline steps — the table's own cap at
  `report.ts:652`, not an unrealistic number — and fills every change-plan box,
  2,764 characters in all. `changePlanHeight` returns 1,997 for it, so the
  split *was* applied; sheet 1 still overflowed, because the split only moves
  the money, the people and Plan B to sheet 2 and leaves the headline, the pull
  quote, "In place by", "What I keep", "The small test I run first" and all five
  steps on sheet 1. There is no three-sheet option.
- **Impact:** a printed page with the footer in the wrong place and the last
  lines cut, or a ragged extra page from the browser's own pagination. It is
  the person's own plan that is cut.
- **Fix, in order of honesty:** measure instead of estimating (render, read
  `offsetHeight`, then decide), or let the plan run to three sheets, or move
  "What I keep" and "The small test" to the second sheet when the steps are
  many. Sheet four needs a rule of its own either way.
- **How to check:** the fixture is `change_plan` with every box at 250 to 400
  characters and five rows in `s3-5.1.steps`; print Step 3 and read each
  sheet's `offsetHeight`.

### R7-6. The consent record proves the two ticks, not the disclosure the person read (MEDIUM)

- **Where:** `src/lib/consent.ts:19-20` ("Bump this when any wording below
  changes") and `:38-47` (`CONSENT_TEXT`), against
  `src/components/ai-consent.tsx:121-136`.
- **What is wrong:** the version covers the two checkbox sentences. The
  material facts are not in them. "Anthropic… is in the United States", "it
  does not use what you write to train its models", "it deletes what it
  receives within 30 days" and the link to the notes all live in the component,
  outside `CONSENT_TEXT` and outside the version. Change the sub-processor, the
  30 days or the training sentence and every stored row still says
  `2026-10-19`, nobody is asked again, and the record no longer shows what was
  agreed to.
- **Why it matters here:** this is the one table whose whole purpose is to be
  evidence later. Everything else about it is right — append-only, server-side,
  session-bound — and this is the gap in it.
- **Fix:** move those paragraphs into `consent.ts` next to `WORDING_VERSION`,
  so "below" is true, and render them from there. A hash of the rendered screen
  stored on the row would be stronger still.

### R7-7. The privacy page promises a three-year consent record that deleting an account destroys (MEDIUM)

- **Where:** `src/app/privacy/page.tsx:143-146` — "What you agreed to, when,
  and the wording you read are kept for 3 years after that consent ends" —
  against `web/supabase/2026-10-18-consents.sql:25`, `user_id … on delete
  cascade`.
- **What is wrong:** deleting the account deletes the consent rows the same
  second. The brief's decision 3 covers the deletion itself, and I am not
  reporting that as a bug. What is a defect is the published sentence, which is
  live and states a retention the code does not keep. One of the two has to
  change, and the sentence is the cheaper one while the lawyer has not answered.
- **If the FK is the one that changes, it needs a migration** — see below.

### R7-8. A staying reader who has only started gets two near-empty A4 sheets (LOW–MEDIUM)

- **Where:** `src/lib/report.ts:822` (`exploreStayingSheets` is 2 whenever
  `written`), `:817` (`written` is true from `change` alone, and `change`
  falls back to `s2-s1.change`).
- **Measured:** with `s2-s1.change` set and nothing else on the staying pages,
  Step 2 prints two sheets. Sheet 1 is a cover line and the headline "The
  change, and what it rests on"; sheet 2 is the headline "The rules, the people,
  and the test" followed only by the standing sentence about Step 3. Total text
  on the two sheets: 220 and 222 characters, most of it furniture.
- **Impact:** the mover's document is sized from an estimate; the stayer's is
  not sized at all. This is the "half-empty sheet" half of attack 4, and it
  lands on the route the repositioning is for.
- **Fix:** require more than `change` before printing anything (`reasons`,
  `test` or `choice`, as `written` already suggests), and fold the second sheet
  into the first when the blocks it carries are empty.

### R7-9. "Special categories" can be recorded on its own through the API (LOW)

- **Where:** `src/app/api/consent/route.ts:44-48`.
- **What happens:** `if (answer.ai === false) answer.ai_special = false` only
  fires when `ai:false` is in the *same* request. `POST {"special":true}` alone
  writes a granted `ai_special` row whatever the `ai` row says, and
  `consentState` will then report `special: true` with `ai: false`.
- **Not reachable from the screens.** The settings box is only rendered when
  `state.ai` (`consent-settings.tsx:74`), and the consent screen sends
  `special: ai && special` (`ai-consent.tsx:110`). I checked the pair LLM1
  asked about and his belief is right: switching the first box off in Settings
  sends `{ai:false}` and the route forces the special row off with it; switching
  it back on later does not revive it, because the newest special row is a
  refusal.
- **Fix:** make the invariant the route's, not the caller's — ignore `special`
  unless the stored or incoming `ai` is granted.

### R7-10. After a wording change the app tells people they switched their AI partner off (LOW — this is attack 1)

- **Where:** `src/lib/consent.ts:124` (`SWITCHED_OFF`), used at
  `draft/route.ts:45`, `partner/route.ts:62`, `profile/route.ts:30`.
- **What happens when `WORDING_VERSION` changes, confirmed by reading the
  rules:** `mustAsk` goes true for everybody, `aiAllowed` goes false, and the
  next AI request is refused — which is what LLM1 believed, and it is right.
  The panel shows the consent screen again on the next load
  (`PartnerPanel.tsx:98-106`). But a page already open gets the 403 text "Your
  AI partner is switched off. You can switch it on again in My settings", which
  is not what happened: they did not switch anything off, and Settings will show
  the box already ticked at the old wording.
- **Why it matters today rather than in theory:** `consents` is empty on the
  live database, so this is the message every existing customer meets on their
  first AI request after this deploy if their panel was already open.
- **Fix:** give the version-bump case its own sentence ("We have updated what
  we ask you to agree to — please read it again"), and let the client reload the
  consent state on a 403 so the screen appears without a page refresh.

### R7-11. A recorded travel time of "1 h 10" prints as "1 h" (LOW)

- **Where:** `src/lib/report.ts:356-370` (`travelTime`), used by the hub at
  `:509-517`.
- **What happens:** the loop returns on the first number-and-unit it finds, so
  "1 h 10" becomes "1 h" and "1 hour 40" becomes "1 h". The footnote under the
  hub says "Travel times as I recorded them", which is then not quite true, and
  the error is always in the flattering direction.
- **Fix:** take a trailing number as minutes when the unit was hours, or print
  the answer as recorded when it does not parse cleanly.

## Promise by promise

| | Promise | Verdict |
| --- | --- | --- |
| 1 | No word reaches Anthropic without a consent record | **Holds.** Three routes import the SDK (`draft`, `partner`, `profile`), each calls `mayUseAi` before the client is built (lines 45/78, 62/144, 30/46), the admin view asks `mayFounderRead` (`admin/participants/[id]/route.ts:25`), and there is no fourth caller of `anthropicClient()`. Note the test only asserts that `mayUseAi(` appears somewhere in the file (`tests/gates.test.ts:87`), so it would pass if the gate ran after the call; today the order is right in all three. |
| 2 | A consent record cannot be forged or quietly changed | **Holds.** The route takes the id from the session and the body cannot carry one (`api/consent/route.ts:33-56`); the table has a select-only policy and no insert policy, and the trigger refuses UPDATE (`2026-10-18-consents.sql`). Live, signed out: 0 rows readable, writes refused with 42501. |
| 3 | A withdrawal is never refused | **Holds.** The only exits are 400 (unreadable body, no address), 429, 500 and 503, and the row is written before any matching. See R7-1: the problem is not a refusal, it is what an unverified acceptance is allowed to write. |
| 4 | A stranger's screen never reveals whether an address bought anything | **Broken in one branch** — R7-3. The first-request path is clean. |
| 5 | Access ends three calendar days later, the refund is unaffected | **Holds.** `accessEndsAt` is the last second of the third day in Lisbon, `ended_at` carries it, `counts()` reads it (`access.ts:42-43`), and both entitlement queries select it. The sweep only tidies — except in R7-2, where tidying goes further than tidying. |
| 6 | Order and withdrawal records outlive "Delete everything" | **Holds.** `withdrawals.user_id` and `entitlement_id` are `on delete set null` (`2026-10-19-withdrawals.sql:43-44`), `entitlements.user_id` likewise (`:85-101`), and `deleteEverything` only removes pictures, ends the seat and deletes the auth user. |
| 7 | The workbook's words are not in any public file | **Holds, and I tested the gate rather than trusting it.** I planted a real Step 3 passage in `.next/static/chunks/__leak-test.js`; `check-public-bundle.mjs` exited 1 and named the file. Removed, re-run, clean: "25 passages checked against 93 public files". It runs as `postbuild`, so the deploy fails. |
| 8 | A person who stays is never second class | **Mostly holds, two gaps.** Their own two sheets print, `isStaying` and `inPlaceLine` name the change and not a move, S7 is draftable (`drafts.ts:27-37`, every field id still present in the content) and the memory field is "places, or a change where you live" (`profile-fields.ts:18`). The gaps are R7-8 (their document is the only one not sized) and R7-5 (their change plan is the sheet that overflows). |
| 9 | Every answer already written still belongs to its field | **Holds.** Field ids were diffed across all three content files: the only removal is Step 1's `learn_next`, `assumptions` kept its id, nothing in `web/src` reads `learn_next`, and 0 of the 20 live answer rows contain it. |

## Attack by attack

1. **The consent version gate.** Both of LLM1's beliefs are right: the next
   request is refused, and `ai_special` is forced false when the first box is
   switched off. Two leftovers: R7-10 (the refusal says the wrong thing) and
   R7-9 (the forcing is per-request, not an invariant).
2. **The rate limit.** Yes, a person can be locked out by somebody else, and
   the global ceiling is the smaller half of it. The sharper one is the "one
   open request per address" rule: once anybody has filed for your address, your
   own request takes the `already` branch and writes nothing, so the person who
   needs the 14-day deadline cannot file. The trade is the right one for the
   global ceiling — thirty in ten minutes is generous and an owner who is
   refused can email — but I would exempt a signed-in owner's request from the
   ceiling and let it supersede an open public row rather than be absorbed by it.
3. **S7 against S1.** Not backwards anywhere. `exploreStaying` reads
   `f("change") || text(a,"s2-s1","change")`, and the same shape for `gives`,
   `not_give` and `test` (`report.ts:800-806`): S7 wins and the earlier page is
   only a fallback. `changePlan` reads `change_plan` directly with no fallback at
   all, so there is nothing to get backwards.
4. **The sheet-splitting rules.** Lands — R7-5 for the overflow and R7-8 for
   the half-empty sheet.
5. **`movingWritten`.** Lands in the direction LLM1 feared most — R7-4,
   somebody loses pages of their own work. The other direction is safe:
   `movingSheets` is `r.movingWritten || extra === 0`, so a person with nothing
   written still gets the three sheets rather than none.
6. **The daily sweep.** One other way, and it is R7-2. The "bought again" guard
   itself is sound for the case it was written for, but it reads the entitlement
   after the same run's revoke, which is why a hand repair does not survive.
7. **The content pipeline.** Both run, both honest. `check-together`: 76 pages,
   all accounted for (32 mine, 41 ours, 3 read). I added an unclassified
   exercise to a scratch copy of `step3-content.json` and it exited 1 naming the
   page, so the gate is real. `check-content` against the two workbooks LLM1
   changed this round, extracted from the .docx myself: Step 3 Rev.01b, 781
   workbook sentences against 818 app sentences, 14 and 11 unmatched; Step 2
   Rev.01c, 859 against 892, 31 and 8. I read every unmatched line. They are
   front matter (the copyright line, "your answers are your own"), printed-book
   furniture ("How this workbook works", "Where to check it yourself:", "Can you
   skip this part?"), and labels the app splits differently from the book — the
   four S7 choices, for instance, are in the app as `options` and in the book as
   four sentences that continue past the label. LLM1's description of what
   remains is accurate; his counts I can now confirm rather than take on trust.

## Needs a migration or a hand repair (live database)

Nothing in this round's findings needs a migration to fix. Two things need the
live database touched by hand, and they should be done before or separately
from any deploy:

1. **If any withdrawal has to be undone, the row must be cancelled in SQL**
   (R7-2). Restoring the entitlement is not enough and is actively undone:
   ```sql
   update public.withdrawals set status = 'cancelled' where id = <id>;
   ```
   and only then restore the purchase with the admin route. Until R7-2 is
   fixed, treat "reply to this email and we will stop it" as a two-step repair.
2. **R7-7 is a choice between a sentence and a migration.** Changing the
   privacy text needs no migration. Keeping the three-year promise instead
   means `consents.user_id` going to `on delete set null` plus a sweep that
   deletes consent rows three years after the consent ended — a migration on a
   live table, and one the lawyer's answer may make unnecessary. I would change
   the sentence now and revisit when he answers.

No rollback of the three migrations is needed for anything I found. The
`withdrawals` table, the `consents` table and the nullable
`entitlements.user_id` are all doing what the brief says they do.

## Checks that ran

- `npm test` — 315 tests, 315 pass, 0 fail. `npx tsc --noEmit` clean. `npm run
  lint` clean. `npm run build` clean, and `postbuild` reported "public bundle:
  clean. 25 passages checked against 93 public files."
- The planted leak described under promise 7, and its removal.
- Live, with the anon key and no session: `consents` and `withdrawals` return 0
  rows; inserts are refused with 42501. `consents` is empty, so every AI request
  on the live app is refused until each person answers the new screen — which is
  expected, and is R7-10's practical edge.
- Every printed sheet of Step 2 and Step 3 measured at A4 on four fixtures:
  Sample B, Sample B with long answers, a mover with no place named, and a
  staying reader who has only started.
- `check-together.mjs`, `check-content.mjs` against Step 2 Rev.01c and Step 3
  Rev.01b (extracted from the .docx with `My Purpose/_build/docx-to-text.js`),
  and the unclassified-page test in a scratch copy.
- Field ids diffed across all three content files against the 20 live answer
  rows (promise 9).
- Read in full: `withdraw/route.ts`, `consent/route.ts`, `consent.ts`,
  `consent-server.ts`, `retention/route.ts`, `withdrawal.ts`, `access.ts`,
  `access-server.ts`, `ai-consent.tsx`, `consent-settings.tsx`,
  `change-plan.tsx`, `explore-staying.tsx`, `step2.tsx`, `step3.tsx`,
  `report.ts`, `drafts.ts`, `forget-account.ts`, `gates.test.ts`, the three
  migrations and the privacy and terms pages.

## What I could not check, and what it would take

- **The consent screen as a screen, signed in.** Preview mode draws "Your AI
  partner works when you are signed in", so the screen never renders there. I
  read it line by line and found R7-6 that way, but nobody has seen it as a
  page. It would take one signed-in account and two minutes; I did not use the
  live accounts because this round carried no permission to act on them.
- **A real purchase, withdrawal or refund.** Still Lemon Squeezy test mode in
  Mwata's script. R7-1 and R7-2 are both reasoned from the code and from the
  sweep's own dry output, not from a real order. R7-1 can be checked against a
  throwaway entitlement row without any money moving; R7-2 needs one sweep run
  after a hand repair, which `?dry=1` will show without deleting anything.
- **Emails as delivered mail.** I read every letter the code builds. Nothing
  was sent.
- **The staying route as a person.** Still Mwata's test script. My four
  fixtures are fixtures; R7-4 and R7-8 are the two places I would expect his
  pass to feel wrong rather than see wrong, because both fail by leaving things
  out quietly.
- **`check-content` against Step 1 Rev.01e.** The repository's `step1-v19.txt`
  is an older revision, and I compared only the two workbooks this round
  changed. Running it against Rev.01e needs one more `docx-to-text.js` pass.

## The fix list, in order

1. **R7-1** — stop an unverified public withdrawal from writing
   `entitlements.ended_at`. Code only, and it closes the deletion chain.
2. **R7-2** — make the repair complete: cancel the withdrawal row, or skip a
   withdrawal whose entitlement is active again. Until then, the SQL above.
3. **R7-4** — widen `movingWritten` to everything the three sheets read, so
   nobody's research goes unprinted.
4. **R7-3** — make the `already` branch neutral, and move it below the rate
   limit.
5. **R7-5** — measure the change plan instead of estimating it, and give sheet
   four a rule.
6. **R7-6** — move the disclosure paragraphs next to `WORDING_VERSION`.
7. **R7-7** — change the privacy sentence (or decide the migration).
8. **R7-8** — require more than one line before printing the staying sheets,
   and fold the second when it is empty.
9. **R7-10**, **R7-9**, **R7-11** — the wording after a version bump, the
   special-categories invariant, and "1 h 10".

---

# Fixes and rechecks — round 7 (LLM1, 2026-10-20)

All eleven findings are done. Nothing was disputed: both HIGH findings were
reproduced in the code before being changed, and R7-5 was measured in the
browser rather than argued about.

| # | Finding | What changed | Checked |
| --- | --- | --- | --- |
| R7-1 | An email address alone ended a stranger's access, and the sweep then deleted their account | `provesOwnership` (`lib/withdrawal.ts`): access ends only when the request came from the person whose purchase it is — signed in on that account, or carrying the order number from their own receipt. Everything else is still recorded, answered and emailed, with `note` saying it was not proved. A later request that does prove itself upgrades the open row instead of being absorbed by it. | End to end on a throwaway purchase: a stranger's request left `ended_at` null; the owner signing in set it to the third day. Both rows deleted afterwards. |
| R7-2 | Undoing a withdrawal left the row saying "received", so the sweep deleted the account anyway | The admin PATCH now also sets `withdrawals.status = 'cancelled'` and logs it, and the sweep skips (and cancels) any withdrawal whose entitlement is active again with no end date. | Both halves against the live database; Mwata's own test row is the cancelled one. |
| R7-3 | The `already` branch told a stranger whether an address had bought the course, and sat outside the rate limit | The public answer is now the same neutral shape as a first request; the dates go only to a signed-in caller. The branch moved below the counting, so it cannot be polled. | Two identical POSTs from outside, signed out, give indistinguishable bodies. |
| R7-4 | A mover who had not named a place lost the three sheets they filled in | `movingWritten` now reads all nineteen signals the three sheets print from, not the place alone. | Unit tests, and Sample B still prints the staying route only. |
| R7-5 | Long answers ran 94px and 35px past A4, with the split applied and no third sheet | The estimate is gone. Every block is sized on its own and packed in the order it reads (`changePlanLayout`, `orderLayout`), onto as many sheets as the answers need, with the footnote's height held back so the last sheet always has room. Sheet four of My Decision has a rule for the first time, and page numbers follow. The constants were read off the browser: the body box is 922px, a line of body text 24px, a full-width line about 105 characters, a half-width column about 48. | Three fixtures measured sheet by sheet at 1280x1400: every sheet at 1123px, the fullest at 897 of 922. Sample B is unchanged at six sheets; the full fixture takes eight. |
| R7-6 | The consent record proved the two ticks, not the disclosure the person read | The four material facts (Anthropic, the United States, no training, 30 days) are now `CONSENT_DISCLOSURE` in `lib/consent.ts`, next to `WORDING_VERSION`, and the screen renders them from there. Changing them changes the version, so everybody is asked again. | The screen reads as before; the test that reads the component for the lawyer's wording still passes. |
| R7-7 | The privacy page promised a three-year consent record that deleting an account destroys | The sentence now says what is true: the records are kept while you have an account, and for up to three years after a consent ends, and deleting the account takes them with it. No migration. | The live page after the deploy. |
| R7-8 | A staying reader who had only started got two near-empty sheets | `written` needs four of the eleven fields, and the second sheet is only printed when there is something found out to put on it (`stayingTailWritten`): the rules, the people, the test or the choice. Otherwise the closing lines stay on the first sheet. | A fixture with the change, the money and the week prints one sheet of 434px; Sample B still prints two. |
| R7-9 | "Special categories" could be recorded on its own through the API | The route drops a special-categories tick that arrives without the first box being granted, so the invariant holds in the table and not only on the screen. | Unit test. |
| R7-10 | After a wording change people were told they had switched their AI partner off | Three refusals, three sentences (`aiRefusal`): never asked, switched off, and "we have updated what we ask you to agree to". An unreadable table says so rather than blaming the person. A 403 also makes the panel read the consent state again, so the right screen appears without a reload. | Unit test for all three, plus the gates test, which now watches `whyNoAi` at every AI door. |
| R7-11 | A recorded travel time of "1 h 10" printed as "1 h" | The minutes after the hour are read, including "1 hour 40", "1 h 10", "1h10" and "1.5 h". A trailing number that is a distance or another hour is still ignored. | Eight cases in `report.test.ts`. |

One thing beyond the findings, from LLM2's attack 2: a signed-in person asking
about their own address is no longer subject to the global ceiling of thirty
requests in ten minutes. Their own daily limit still applies. Somebody else's
abuse must not stand between a person and their own 14 days.

Tests 327/327, typecheck, lint and the production build with the public-bundle
check all pass.

## What this leaves for Mwata

1. `TEST-consent-and-withdrawal.md`, end to end, including the Lemon Squeezy
   run on order 9762789.
2. The lawyer's three questions in `LEGAL-wording-for-review.md`.
3. Supabase Pro before the first paying customer, which is also when the "no
   separate backups" sentence changes.
