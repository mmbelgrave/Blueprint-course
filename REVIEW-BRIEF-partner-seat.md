# Review brief for LLM2 — the partner seat (round 6)

Written by LLM1 on 16 October 2026, for a review of work that is pushed and
live but **not yet tried by two people**. Findings go in `REVIEW.md` as round
6, in the format the earlier rounds use.

## What to review

Three commits on `main`, nothing else:

| Commit | What |
| --- | --- |
| `5ced2e8` | Slice 1: the seat, and the answers a household shares |
| `75bac23` | Slice 2: the comparison |
| `b71674e` | One matching rule on both sides of the comparison |

`git diff 5ced2e8~1 HEAD` is the whole change: 42 files, about 2,400 lines of
new code. The two migrations are in `web/supabase/2026-10-15-partner-seat.sql`
and `web/supabase/2026-10-15-private-pages.sql`, and **both were run on the
live database on 15 October** by Mwata.

## What it is meant to do

`PROJECT.md` §6.8 is the specification, agreed with Mwata on 15 October.
`design/partner-seat.md` holds the page-by-page decision and the reasoning;
`design/partner-seat-mockup.html` shows the four screens.

In short: one purchase may invite one partner. Each person has their own
account, answers, AI partner and notes. Some pages the household answers once
(all the money, the facts about a place, the timeline, the lights, the decision
being tested: 37 of them), some pages each person answers alone and then the
two answers are shown side by side (29), three are only to read.

## The promises that must hold

These are the review. Everything else is detail. Each one says where to look
and how it is supposed to be kept.

1. **A partner cannot read the buyer's personal answers.** Only the shared ones.
   Row-level security was deliberately **not** loosened: `answers` still allows
   a person their own rows only. Shared answers live on the buyer's rows and
   are reached through `web/src/app/api/household/*` with the service role.
   Look for any path that returns a row the asker should not have, and for the
   filter `sharedAnswer(exercise, field)` being skipped anywhere.
2. **Nothing of the other person's personal answer reaches anybody until both
   have written it.** `mayCompare` in `web/src/lib/together.ts`, used by
   `comparePage` in `household-server.ts`. The route must not attach `theirs`
   when `may` is false. Check the step view too (`compareStep`): it is supposed
   to carry yes/no only, never words.
3. **A page kept private stays private**, even after both have written.
   `private_pages`, and the three pages allowed are 2.3, 2.4 and 3.1
   (`together.json`, `private_allowed`). `setPrivate` must refuse any other
   page, and nobody may read or change another person's list.
4. **The AI partner never sees the other person's personal answers.**
   `answersIMaySee` in `household-server.ts`, used by `/api/partner`,
   `/api/draft` and `/api/profile`. It adds the household's shared answers to a
   person's own and nothing else. This is deliberately enforced in the query
   rather than in the prompt.
5. **Nothing is overwritten silently.** Two people in one money table:
   `conflict()` in `household.ts` and `writeShared` in `household-server.ts`.
   A save that arrives after the other person wrote that same field must save
   nothing and return both answers. Only an explicit `force` (the person
   pressing "Keep mine") may overwrite.
6. **A refund ends the partner's access at the same moment.** Entitlements are
   read from the buyer, never copied: `householdEntitlements`. Check there is
   no second copy of an entitlement anywhere that could outlive the buyer's.
7. **No swapping.** One seat per buyer, one open seat per address, one
   household per partner: the three unique indexes in the seat migration, plus
   the refusals in `/api/seat`. Changing an address is meant to be impossible
   from the app.
8. **A person working alone sees no change at all.** This matters most, because
   that is every live account today. `/api/household` answers `{role:"alone"}`
   and the app behaves as before. Check the case where the migrations had not
   been run (a missing table must read as "no seat", not as an error).

## Where I would attack it

Concrete scenarios, with what should happen. A reviewer with two accounts can
run all of them.

1. Partner asks Supabase directly, with their own session, for
   `answers` rows of the buyer. Expected: nothing.
2. Partner calls `/api/household/compare?page=1.4` **before** writing 1.4.
   Expected: `may: false`, `theirs: null`, and no trace of the buyer's words in
   the response body.
3. Partner calls `/api/household/compare?page=3.2` (a shared page, not a
   personal one). Expected: refused.
4. Partner calls `/api/household/answer` with a **personal** page and field
   (for example `1.4` / `must_haves`). Expected: refused, and nothing written
   to the buyer's rows.
5. Partner calls `/api/household/answer` with `force: true` immediately, having
   never loaded the page. Expected: it writes, because that is what force
   means; the question is whether anything else should stop it.
6. A stranger (an account in no household) calls every `/api/household/*` route
   and `/api/seat` POST. Expected: 403 or 401, nothing written.
7. Buyer invites an address that already owns the Blueprint, or already has a
   seat with somebody else, or their own address. Expected: all refused, with a
   readable message.
8. Buyer invites, then invites a different address. Expected: refused, told to
   email Mwata.
9. Buyer invites the **same** address twice. Expected: the letter goes again.
10. Partner marks 2.3 private, then the buyer opens 2.3. Expected: the buyer is
    told it is private, and gets nothing of it. Then the partner unticks it and
    the buyer sees it (both have written).
11. Partner tries to mark **1.4** private through the route. Expected: refused.
12. Partner tries to read or delete the buyer's row in `private_pages` with
    their own session. Expected: nothing.
13. Both open 3.2 and change the same line within a minute. Expected: the
    second one is asked, not overwritten; after "Keep mine" the first person
    sees the new value when they reload.
14. Buyer marks a shared page done; partner opens Step 1. Expected: the page
    reads as done for them too.
15. Partner's account is deleted. Expected: the seat ends, the buyer keeps the
    shared answers, the buyer's app still works.
16. Buyer's account is deleted. Expected: the seat goes with it, the partner is
    alone and keeps only their own answers.
17. Buyer's entitlement is set to `refunded` by hand. Expected: the partner
    loses access on their next load.
18. The AI partner is asked, as the partner, something like "what did Lotte
    write about what stopped her before?". Expected: it cannot know, because
    the answer was never in its context. Worth checking the request body, not
    just the reply.

## What I actually checked, and what I did not

Ran and passed: `tsc --noEmit`, `eslint`, `node --test` (215 tests, 31 of them
new for these two slices), `next build` with the five new routes in it. On the
live site, `/api/household` and `/api/household/compare` answer 401 to a
stranger and the public pages still answer 200.

**Not checked, and this is the gap the review exists to close:** nothing has
been exercised with two real accounts. No shared answer has been written
through the route by a second person, no comparison has opened, no conflict has
happened, no invitation email has been received, and the two new tables have
never been read by a second session. The migrations were run after the code was
pushed, so even the first query against the real tables is untested.

Also untested: the twenty-second poll on a waiting page, the "You and Ben" card
with real data, and whether the invitation letter renders well in a mail
client.

## Decisions a reviewer should not report as bugs

Argue with them if they are wrong, but they are deliberate.

- **4.1 is personal, not shared with a feeling column each**, which is what the
  agreed table said. The option and the feeling live in the same table field,
  and a field is the unit an answer is stored under, so splitting them needs
  column-level sharing. Noted in `design/partner-seat.md`.
- **No live sync.** Supabase Realtime is not used. A shared page shows the
  other person's writing when the app loads, a waiting comparison asks again
  every twenty seconds, and that is the whole freshness story.
- **The invited account is created when the invitation is sent**, with the
  service role and no Supabase email. It makes the seat work even if sign-up is
  closed again. A typo therefore creates a stray account with no entitlement.
- **Shared answers live on the buyer's rows**, which is what makes "the answers
  stay with the buyer if the seat ends" true with nothing to move.
- **Two voices in the result documents are not built** (slice 3). A couple
  currently gets two single-voice documents, each printing the shared facts and
  that person's own personal answers.
- **The agreed answer on 5.1 and 3.4.2** is stored as a shared answer under the
  reserved field id `agreed`. It is not yet printed anywhere.
- **`send-mail.ts` is a fifth copy of the Resend call** in spirit: four older
  routes still have their own. Known, and deliberately not refactored in the
  same change.

## Still open from round 5, not part of this work

R4-9 (the five lights read only the `green_lights` table, so somebody who
filled the lights in on the individual pages gets a blank Decision document),
R4-10, R5-5 (an old public chunk may still sit in an edge cache), and the admin
overview asking Supabase for 1000 accounts in one call with no paging.

## How to run the safe checks

```
cd web
npm ci                      # node_modules was rebuilt on 15 October
node node_modules/typescript/bin/tsc --noEmit
npm run lint
npm test
npm run build
node scripts/preview-mode.cjs      # port 3001, no Supabase, no sign-in
node ../content-build/check-together.mjs
```

Preview mode cannot show a household: it has no server and no second person.
Anything about two people needs the live app and two addresses.
