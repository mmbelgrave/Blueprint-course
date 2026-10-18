# Scope: AI consent box and "Withdraw from contract" function

Written 18 October 2026 (planner role). Nothing here is built yet. Source: the legal pre-review of 17 October (Terms §9, privacy note §2, app notice) and the app code as it stands. The website terms and privacy note (v28) already describe both items, so the app has to catch up.

## A. AI consent before the first AI chat

### What exists today
- `profiles.consent_ai` (boolean, default false) is set by an unticked box on `/onboarding` ("my AI partner may read what I write and send it to Anthropic… I agree") and by a toggle on `/settings`.
- The server already refuses without it: `api/partner/route.ts` (line ~56) and `api/draft/route.ts` (line ~47) return 403 when `consent_ai` is false. `PartnerPanel.tsx` shows "switched off, go to My settings".
- A separate, unticked `consent_founder_access` box (Mwata reads answers) already exists. Keep as is.

### Gaps against the review and the published notices
1. The wording has no explicit consent for special-category data (GDPR Art. 9(2)(a)). The published note promises this.
2. Consent is asked at sign-up, not at the moment the AI is first used. The published note says "a separate box shown before your first AI chat".
3. No record of when, or to which wording, someone consented (Art. 7(1): we must be able to show it).
4. No reminder next to the chat box about sensitive data.
5. No plain "you are talking to an AI" line at the start of every chat (AI Act Art. 50, in force since 2 August 2026).

### Proposed change (recommended)
Ask once, at the point of use, and make that the only place the box lives.

1. **Consent gate in `PartnerPanel`.** When `consent_ai` is false or its version is old, the panel shows the explanation and one unticked box instead of the "go to settings" line:
   - what is sent (what you write in the chat, your answers on the page and earlier answers, the AI's short notes) and to whom (Anthropic, United States, deleted within 30 days unless the law requires otherwise or a message is flagged);
   - the Art. 9 sentence: if you choose to write special categories of data (health, religion, sexual orientation, political opinions) you explicitly consent to their processing as described;
   - "Optional. You can withdraw in Settings at any time. Everything else keeps working."
   - Buttons: "Switch on my AI partner" (disabled until the box is ticked) and "Not now".
2. **Remove the AI box from `/onboarding`.** Fewer boxes at sign-up, one place for the choice. The "Mwata may read my answers" box stays there.
3. **Record the consent.** New columns on `profiles`: `consent_ai_at timestamptz`, `consent_ai_version text`. Set both when the box is ticked, clear `consent_ai_at` on withdrawal. A constant `AI_CONSENT_VERSION = "2026-10-18"` lives in code; changing the wording means bumping it.
4. **Existing consents.** Anyone with `consent_ai = true` and no version gets the gate once more, because they agreed to older wording. Server routes require `consent_ai = true` AND `consent_ai_version = AI_CONSENT_VERSION`. (Likely only a handful of accounts today; check with a count before the migration.)
5. **Settings toggle** keeps working as the withdrawal route. Switching on from Settings shows the same wording and records the version.
6. **Reminder line under the chat box:** "Please avoid health details and other sensitive data unless you want the AI to use them."
7. **AI notice** at the top of every chat: "You are talking to an AI, not a person." (short, always visible in the panel header area).
8. **Draft helper** (`api/draft`) uses the same gate and the same server check, so nothing reaches Anthropic before consent.

### Files touched
`supabase/schema.sql` plus a dated migration; `src/lib/backend/types.ts` and `supabase.ts` (profile fields); `src/app/onboarding/page.tsx`; `src/app/settings/page.tsx`; `src/components/PartnerPanel.tsx`; `src/app/api/partner/route.ts`; `src/app/api/draft/route.ts`; `src/app/api/profile/route.ts` (save timestamp and version, reject a ticked box without the current version); `src/app/privacy/page.tsx` and `privacy-in-the-app.md` (see C).

### Tests
- New unit test: both routes return 403 with no consent, with consent on an old version, and 200 with the current one.
- Extend `scripts/partner-check.ts` with a consent-version case.
- Manual: watch the network tab on a fresh account and confirm no request to Anthropic before the box is ticked (the review's check); withdraw in Settings and confirm the next chat is refused.

## B. "Withdraw from contract here"

### What exists today
- Orders arrive from Lemon Squeezy through `api/lemonsqueezy/webhook/route.ts`; the buyer's access is an `entitlements` row (`order_id`, `amount_cents`, `created_at`).
- A refund event already sets the entitlement to `refunded` and ends access (and any partner seat). So once the money is refunded, the access side is automatic.
- `lib/send-mail.ts` sends plain-text email through Resend. `/settings` has an account section (export, delete). The Lemon Squeezy API is not used by the app today; refunds are done by Mwata in the Lemon Squeezy dashboard.

### Legal shape (from the review)
A two-step online function, "Withdraw from contract here" then "Confirm withdrawal", reachable without having to look for it, with an acknowledgement email stating the date and time. The 14 days run from the day of purchase, and the full price is refunded to the original payment method. The published terms currently offer email and a model form instead, until this exists.

### Proposed design (two entry points, one handler)
1. **Signed-in: Settings → Account → "Withdraw from contract here".** Shows the order (product, date, amount) and, if within 14 days, the button; step two shows "Confirm withdrawal" with a one-line consequence ("your access ends and you get the full price back"). After 14 days it shows "The 14-day period has passed. The 30-day guarantee still applies: email us" with a mailto link.
2. **Public page `/withdraw`** for buyers who have not signed in (or lost access): order number and the email used to pay, then "Confirm withdrawal". The handler checks the pair against `entitlements`/the order reference before acting. No login needed, so it can be linked from the website terms, the receipt email, and the app footer.
3. **Handler `POST /api/withdraw`:**
   - find the entitlement by user (signed in) or by order reference plus email (public); refuse politely if unknown or already refunded;
   - insert a row in a new table `withdrawal_requests` (`id`, `entitlement_id`, `order_id`, `email`, `requested_at` with time zone, `status` = `requested` / `refunded`, `refunded_at`, `source` = `app` / `public`);
   - email the buyer an acknowledgement with the date and time and the plain promise "we refund the full price within 14 days, to the payment method you used" (the legal "without delay" confirmation);
   - email Mwata: "Withdrawal requested: order X, €99, refund it in Lemon Squeezy".
4. **Refund itself: manual at launch (recommended).** Mwata clicks Refund in Lemon Squeezy; the existing webhook then ends access and marks the request `refunded`. This keeps the app free of a payment API key and costs nothing to build. Volume is small. Add a daily reminder (or admin list of open requests in `/admin`) so none waits more than a day or two.
   - Optional later: call Lemon Squeezy's refund endpoint from the handler for requests inside 14 days. Needs an API key in Vercel and one more failure path; only worth it at higher volume.
5. **Access during the pending refund:** keep access until the refund lands (no surprise lock-out), unless Mwata prefers to end it at request time. Decision below.
6. **Website follow-ups:** once live, update Terms §9 to name the button and link `/withdraw`; keep the model form and email route as fallbacks. Footer link "Withdraw from contract" on the app and the website.

### Files touched
New: `supabase/2026-10-18-withdrawal.sql`, `src/app/withdraw/page.tsx`, `src/app/api/withdraw/route.ts`, `src/lib/withdrawal.ts` (window check, matching, emails), `tests/withdrawal.test.ts`. Changed: `src/app/settings/page.tsx` (account section), `src/app/admin/page.tsx` (open requests list), `src/app/api/lemonsqueezy/webhook/route.ts` (mark request `refunded` on the refund event), the app footer, `privacy-in-the-app.md` (a line on the retention of withdrawal requests: keep with the order record).

### Tests
- Unit: 14-day window edges (day 14 inside, day 15 outside, time zones), duplicate request, wrong email for an order number, already refunded.
- Webhook: a refund event closes the open request.
- Manual in Lemon Squeezy test mode: buy, withdraw (signed in), withdraw (public page with a second order), refund in the dashboard, confirm access ends and the request shows `refunded`. This also answers the review's "refund one test order in test mode" check.

## C. Dependencies that travel with these two
- **App privacy notice.** `src/app/privacy/page.tsx` and `privacy-in-the-app.md` disagree with the published website note (no legal bases, no transfers, four rights instead of seven, no CNPD, no browser storage). The review supplies replacement text. Easiest and safest: the app page becomes a short summary that links to the one website note, so they cannot drift. Needed for the consent wording to be consistent.
- **Link the Terms and privacy note** from the sign-in page and the footer.
- **Receipt/welcome email:** add one line with the `/withdraw` link.

## Effort and order
| Piece | Size | Notes |
|---|---|---|
| A. AI consent gate, version record, reminder, AI notice | about 1 day | Migration is small; most work is the panel and the tests |
| B. Withdrawal function (manual refund) | about 1.5 to 2 days | New table, page, handler, two emails, admin list, tests, one test-mode run |
| C. App privacy page replaced by summary and link | about 0.5 day | Wording from the review; legal text needs your approval |

Suggested order: A, then C, then B. A and C make the live app match the published notices. B needs a Lemon Squeezy test-mode run, so do it when you can watch it.

## Decisions for the owner
1. Consent only at first use (recommended), or also keep a box at sign-up?
2. Re-ask existing consents once (recommended), or leave existing consents as given?
3. Withdrawal refund: manual in Lemon Squeezy at launch (recommended) or automatic through its API?
4. Access while the refund is pending: keep until refunded (recommended) or end at request time?
5. Wording of the consent box and the confirmation emails: I draft, you and the lawyer approve (house rule: no legal text goes live unapproved).
