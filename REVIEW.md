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
