# Review brief for LLM2 — round 7

Written by LLM1 on 19 October 2026, for a review of work that is pushed and
live. Findings go in `REVIEW.md` as round 7, in the format the earlier rounds
use.

Mwata runs the human test script (`TEST-consent-and-withdrawal.md`) after this
review, so anything you find now saves him a wasted pass.

## What to review

Everything on `main` since round 6:

```
git diff b71674e..HEAD        # 151 files, ~10,350 insertions, ~890 deletions
```

Four bodies of work, in the order they landed:

| Commits | What |
| --- | --- |
| `5b99ac3`…`ef732d6` | The Introduction video and audio; two voices in the result documents (seat slice 3) |
| `90355a7`…`a6807ef` | Withdrawal from the contract, AI consent, and the legal pages |
| `5bea6f1`…`6d678e7` | Review findings R4-9, R4-10, R5-5, and the admin account paging |
| `87c9d12`…`99538d5` | The repositioning: Steps 1 to 3 on the new workbooks, the staying path, Sample B |

Three migrations were run on the live database by Mwata and are in
`web/supabase/`: `2026-10-18-consents.sql`, `2026-10-19-withdrawals.sql` (which
drops the empty `withdrawal_requests` and changes `entitlements.user_id` to
`on delete set null`), and nothing else.

## What it is meant to do

Three specifications, all agreed with Mwata:

- **Withdrawal and consent**: the lawyer's "Legal text to paste (18 Oct 2026)",
  sections D1 to D3, plus Mwata's decisions of 18 and 19 October. The memo
  `LEGAL-wording-for-review.md` lists every place the app deliberately differs
  from the lawyer's text, and why.
- **The repositioning**: "The Life You Choose: Repositioning Summary"
  (19 October). Its staying-route gate is the measure, and
  `ALIGNMENT-repositioning.md` is my plan against it.
- **The workbooks**: Step 1 Rev.01e, Step 2 Rev.01c, Step 3 Rev.01b. The app
  was two or three revisions behind on each.

## The promises that must hold

Each one says where to look and how it is supposed to be kept. Everything else
is detail.

1. **No word reaches Anthropic without a consent record.** `mayUseAi(userId)`
   reads the `consents` table live, at the current wording version, on every
   AI request. Four doors ask it: `/api/partner`, `/api/draft`, `/api/profile`
   and the admin view of somebody's answers (that one asks `mayFounderRead`).
   `tests/gates.test.ts` walks every route that imports the Anthropic SDK and
   fails if one is not on the list. Look for a fifth door, a cached answer, or
   a path where the gate runs after something is already sent.
2. **A consent record cannot be forged or quietly changed.** RLS allows
   reading your own rows and no insert policy exists; a database trigger
   refuses any UPDATE. Every row is written by a server route that takes the
   user id from the session. Look for a write that trusts the body.
3. **A withdrawal is never refused.** The only refusals in
   `/api/withdraw` are a broken request, a missing email, rate limiting and
   our own failure to save. A mistyped or absent order number must not block
   it, and the row is written before any matching happens. A test asserts the
   set of status codes the route may return.
4. **A stranger's screen never reveals whether an address bought anything.**
   The public page returns a neutral receipt; the matched order, the amount
   and the access date go only into the email. Look for a leak through timing,
   an error message, or the `already` branch.
5. **Access ends three calendar days after a withdrawal, and the refund is
   unaffected.** `accessEndsAt` ends at the last second of the third day in
   Lisbon, `entitlements.ended_at` carries it, and the access rules already
   refuse a purchase whose end has passed. The daily sweep only tidies up.
6. **The order and withdrawal records outlive "Delete everything".**
   `entitlements.user_id` is now nullable with `on delete set null`. Consent
   rows do go with the account, deliberately; the lawyer has been asked
   whether that is right.
7. **The workbook's words are not in any public file.** `R4-1` put Step 1 and
   Step 3 in a public chunk once. `scripts/check-public-bundle.mjs` now runs
   as `postbuild`, so a leak fails the deploy. Try to find a path that puts
   content text into `.next/static`.
8. **A person who stays is never second class.** This is the repositioning's
   gate, and it is the part I would review hardest:
   - they can start without naming a country (Step 2 Parts 1 and 2 are
     optional, and every part says where a staying reader goes instead);
   - they finish with a real result (`s2-s7` prints its own two sheets, and
     the Step 2 document now omits the Parts 3 to 5 sheets when nobody
     answered them);
   - their documents name their change, not a move (`isStaying`, the cascade
     label, the Blueprint sentence, `inPlaceLine`);
   - they get the same AI help (S7 is draftable, and the partner's memory
     covers either route).
9. **Every answer already written still belongs to its field.** Field ids did
   not move. The one merge (Step 1's "Assumptions" and "What I need to learn
   next" into "Questions to settle") kept the id `assumptions` and dropped the
   other, which nothing read.

## Where I would attack it

1. **The consent version gate.** `WORDING_VERSION` is `2026-10-19`. What
   happens to somebody mid-chat when it changes? What happens to the special
   categories row when the first box is switched off? I believe the answer is
   "the next request is refused" and "`ai_special` is forced false", but I
   wrote both, so check them.
2. **The rate limit.** One open withdrawal per address, five a day per
   address, thirty in ten minutes for everybody. Can a person be locked out of
   withdrawing by somebody else's abuse? That is the trade I made; say so if
   it is the wrong one.
3. **`exploreStaying` and `changePlan` fall back to the pages behind the
   summary.** If somebody fills S1 and then changes their mind on S7, which
   wins? (S7 does. Check I did not get it backwards anywhere.)
4. **The sheet-splitting rules.** `changePlanSheets` and
   `exploreStayingSheets` decide one sheet or two from an estimate of printed
   height. The estimate is calibrated against Sample B only. Find an answer
   length that spills past A4 or leaves a half-empty sheet.
5. **`movingWritten`.** It decides whether the Step 2 document prints its
   first three sheets. If it is wrong in either direction, somebody loses
   pages of their own work or gets three empty ones.
6. **The daily sweep.** `/api/retention` now does four jobs. The one that
   frightens me is `delete-data`: thirty days after access ends it deletes an
   account. It checks first whether the person bought again. Look for any
   other way it could fire on somebody who should keep their data.
7. **The content pipeline.** `check-together.mjs` refuses a page that is not
   classified, and `check-content.mjs` compares the app against the workbook
   text both ways. I added seven pages and many sentences. Run both.

## What I actually checked, and what I did not

Checked, live or by measurement:

- Consent refusal end to end, with a throwaway account: no record, granted,
  switched off, and granted at older wording. All four refuse or allow as they
  should. The account was deleted afterwards and its consent rows went with it.
- The withdrawal route's 400/404/429 behaviour from outside, signed out.
- Both deletion jobs in dry mode against the live database.
- Every print document measured sheet by sheet at A4 (794 x 1123). All six
  sheets of Step 3, both of Step 2, three of Step 1.
- `check-content` against all three workbooks: what remains is the printed
  book's own furniture (box labels, page headings, front matter).
- The public bundle, fetched from the live site, against twelve passages of
  teaching text.

Not checked, and the reason:

- **Nobody has been through the staying route as a person.** That is Mwata's
  test script. Sample B is a fixture, not a user.
- **No real purchase, withdrawal or refund.** Lemon Squeezy test mode is in
  his script. The live order 9762789 is the subject of section 4.
- **The consent screen as a screen.** I never signed in as either of the two
  real accounts; both will be asked again on their next AI panel open.
- **Emails as delivered mail.** I rendered every letter from the live code but
  sent none.

## Decisions a reviewer should not report as bugs

1. Three calendar days, not working days, for access after a withdrawal
   (Mwata, 19 October). Portuguese holidays are deliberately not counted.
2. The withdrawal page stays up after anybody's 14 days, and accepts requests
   outside both windows. The sentence changes, not the button.
3. Consent rows are deleted with the account while the order and withdrawal
   rows survive. The lawyer has been asked; until he answers, this stands.
4. Two consent boxes rather than the lawyer's one, using his words split in
   two (Mwata, 18 October).
5. `ordinary-tuesday.pdf` is built from HTML by headless Edge, not by the app.
6. Sample B is a made-up person. The figures tie out on purpose; that is not
   a claim about anybody's results.

## Still open, not part of this work

- Step 4 content, the 14 part videos, Word export.
- Supabase Pro before the first paying customer (the privacy pages currently
  state, truthfully, that there are no backups).
- The lawyer's three questions in `LEGAL-wording-for-review.md`.

## How to run the safe checks

```
cd web && npm test            # 315 tests
cd web && npm run lint
cd web && npm run build       # postbuild runs the public-bundle check
node content-build/check-content.mjs web/src/content/step1-content.json <workbook text>
node web/scripts/sync-content.mjs    # refuses an unclassified page
```

The workbook texts are not in the repository. Extract them from the .docx in
`Belgrave, M.M/My Purpose/` if you want to run `check-content` yourself; a
reviewer who cannot reach that folder should treat my counts as unverified and
say so.
