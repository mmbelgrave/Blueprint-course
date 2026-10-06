# The Made Real Blueprint — the app

**Specification, version 3 · 6 October 2026.** This file says what the app is
and what it does today. It replaces the earlier brief for anything they
disagree on.

- Features were first specified in `build-prompt-v1.md` and renamed in
  `My Purpose/AI Companion/build-prompt-v2.md`. Both are history now: where they
  differ from this file, this file wins.
- **Content** is never written here. Step 1 comes from the Word workbook, through
  `content-build/` into `step1-content.json`. Never change workbook text without
  Mwata's approval.
- `PROGRESS.md` is the diary of how it got here. `GO-LIVE.md` is the operating
  manual (accounts, keys, email). `REVIEW.md` holds review findings.

---

## 1. What it is

A web version of The Made Real Blueprint workbooks, with an AI partner beside
every exercise that helps a person think and never writes their answers for
them. People work at their own pace, mostly in English as a second language.

- **Live at** https://app.maderealblueprint.com (the old `.vercel.app` address
  redirects there permanently).
- **Who uses it:** anyone who signs themselves in. The first twelve are founding
  members doing Phase 1; the app does not yet know who bought what.
- **Mwata (admin):** sees progress, feedback and questions for everyone, and
  answers only from people who ticked that box.

## 2. How it is built

| | |
| --- | --- |
| App | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, React Compiler |
| Hosting | Vercel (Hobby). Releases are atomic; a tab left open keeps working |
| Database and accounts | Supabase (EU region), row-level security on every table |
| Pictures | Supabase Storage, a private folder per person |
| AI | Anthropic `claude-opus-5`, streaming, prompt caching |
| Email | Resend SMTP, from `info@maderealblueprint.com` |
| Brand | `My Purpose/Brandguide/the-life-you-choose-brand-guide.html` |

Keys live in `web/.env.local` and in Vercel. They never reach the browser.

## 3. What the app does today

### 3.1 Getting in
- **No password.** You type your email, a six-digit code arrives, you type it in.
  The code lasts an hour.
- **The email carries the code and no link.** Supabase issues one token per
  email: a mail scanner that opens a link burns the code with it. This was
  proved, not guessed. Never put `{{ .ConfirmationURL }}` back.
- **Anyone may start an account.** No invite list, nobody to add by hand.
  `NEXT_PUBLIC_INVITE_ONLY=true` closes the door again if it is ever needed.
- Signing-in problems are answered in plain words (wrong code, too many tries,
  wait *n* seconds, no internet), and the code box takes a code of any length
  Supabase can send (6 to 10).

### 3.2 Before you start
One screen: first name, currency for the money questions, and two permissions —
the AI partner may read my answers (required to use it), and Mwata may read my
answers and my AI notes (optional, changeable later in Settings).

### 3.3 The workbooks
- **Step 1 Picture** — 6 parts, 21 pages, 5 part summaries. Built from the issued
  workbook, **version 21**.
- **Step 2 Explore** — 6 parts, 17 pages, 4 summaries. Built and in the
  repository, but **closed** until its workbook is final (`journey.json`,
  `in_app: false`, note "opens soon"). The overview greys it; the step page, any
  page inside it and its print page all say "not open yet". Nobody's answers are
  touched. Setting `in_app` back to true opens it, nothing else.
- **Steps 3 to 8** are listed on the overview as "being written".

**Field types:** `long_text`, `short_text`, `list`, `table`, `calculation`,
`checkbox_pick`, `single_choice`, `yes_no`, `number`, `heading`, `image_board`.
Tables can take their rows or column names from an earlier answer, show totals,
filter what counts toward a total, and hide a row until a condition is met.

**The rules that hold the content together**
- Page and field **ids are permanent**. Wording may change freely; an id may not,
  because answers are stored under it. Renaming one makes an answer look lost.
- Money may be "unknown". A total with an unknown in it says **"not complete
  yet"** and never counts it as zero.
- **3.4 and 3.5 count confirmed plus agreed income**; hoped income has its own
  total and stays out of the check (Mwata's decision, 4 October).
- 1.2 keeps a **vision board**: up to eight pictures in the person's own private
  folder, each with one line of text. The AI partner reads only the line.
- The content is checked **both ways** against the Word text
  (`content-build/check-content.mjs`): every workbook sentence is in the app, and
  every app sentence is in the workbook, apart from a short known list.

### 3.4 Moving around
- **The overview** shows all eight steps in three phases, with a progress bar on
  the steps that are open, and "Read this first: how this app works" at the top.
- Inside a step: a **part rail**, **page chips** for the part you are in, a
  **fold** for the long explanations (closed by default, with a reading time), a
  **video slot** per part, and at the foot of each page an arrow back, **Mark as
  done**, an arrow on, then a chip row ending in "Back to overview".
- The app remembers the last page you opened and offers to continue there.

### 3.5 The AI partner
- A chat beside every page (below it on a phone). It knows the workbook, the
  page you are on and your own earlier answers.
- Four helper buttons: **Help me start**, **Ask me a deeper question**,
  **Challenge me**, **How does this fit?**
- **Help me draft this** on summary pages offers a draft built from the person's
  own answers, marked "Draft — make it yours". Nothing is ever written into a box
  without a click.
- Limits per person per day: **80 messages, 20 drafts** (`PARTNER_DAILY_LIMIT`,
  `DRAFT_DAILY_LIMIT`). Every call is written to a usage log with its tokens.
- It never gives legal, tax, visa, medical or investment advice: it names the
  kind of professional to ask.

### 3.6 What the partner remembers
After a page is marked done, the partner updates short notes about the person:
life picture, what their good moments have in common, values, must-haves,
dealbreakers, their life today and in one year, **their time and who decides
it**, strengths, beliefs to check, money, options, fears, places, open
questions, patterns and tensions.

On **What my AI partner knows** a person can read every note, correct one (their
version is then kept), make it forget one (it stays empty), update them from
their answers now, or **delete everything** — answers, pictures, chats, notes,
questions and the account.

### 3.7 Results
Each part except the last ends with "What does this tell me?", which the person
writes and the partner may draft. Step 1 ends with **My Working Direction**, and
there is a print page that saves as PDF with the copyright line on it.

### 3.8 Help
**Help** in the menu, and "Ask Mwata" beside the AI partner on every page. A
question carries its topic and, when it comes from a page, the step and page
already filled in. The person chooses an answer by email or WhatsApp. Three ways
out, all carrying the same opening line: the form, a WhatsApp link and an email
link. A question is **saved first and emailed second**, so it survives a failed
email; Admin says plainly when `RESEND_API_KEY` is missing.

### 3.9 Admin (Mwata only, checked on the server)
Everyone who signed in, with: start date, last activity, progress per part, AI
use and estimated cost, feedback, and questions with a reply link. Answers and
AI notes only for people who gave that consent.

### 3.10 Settings and appearance
First name, currency, both consents, and **How the app looks**: follow my device
(default), light, or dark.

- **Dark** uses the brand guide's own dark rules on a near-black ground: Sand
  text, Ochre-light accent, cards as a thin veil of Sand, #B9C0B2 captions. It
  redefines the same token names the app already uses, so no component knows
  about it.
- The choice is kept **in the browser**, not the account: it belongs to the
  screen you read on, and it has to be known before the first pixel. A small
  script in the page head sets it, so there is no flash of the wrong ground.
- **Printing is always on paper**: the print rules put the light palette back.

### 3.11 Privacy
`/privacy` names Belgrave Management, Unipessoal Lda and
info@belgraveconsultancy.com, and lists what is stored, who reads it, the three
companies involved (Supabase, Anthropic, Resend), how long, and how to delete
everything. It must stay in step with the website's privacy note.

### 3.12 Preview mode
`node web/scripts/preview-mode.cjs` runs the whole workbook with no accounts and
no AI; answers stay in that browser. Used for checking screens quickly.

### 3.13 When a new version is released
Answers go from the browser to Supabase, so a release never touches them. A tab
left open keeps working (measured: files from the previous release are still
served). If it ever does fail, the app recognises "this tab is old" and loads the
page afresh instead of offering a retry that cannot help, at most once a minute.

## 4. Rules that do not change
1. The partner helps someone think. It never writes their answer for them.
2. No legal, tax, visa, medical or investment advice. Name the right professional.
3. Rules and prices are never stated as fact; the workbook's own sources are cited.
4. Ids are permanent (§3.3).
5. Nobody can read anyone else's data. Row-level security on every table, admin
   work only on the server with the service-role key.
6. Ask Mwata before: spending money, publishing, changing workbook text, or
   changing legal text.

## 5. Acceptance checks
1. I can sign in with a code, give consent, and complete every page of Step 1.
2. Answers save themselves and are still there after closing the browser, on
   another device, and in another browser.
3. The partner answers short and simple, one question at a time, in my language,
   and refuses to write my answers.
4. In a new session it still knows my earlier answers.
5. It declines legal/tax/visa/medical/investment advice and names the right expert.
6. I can read, correct and forget what it knows, and delete everything.
7. I can write each part summary, accept a draft, and save my Working Direction
   as PDF with the copyright line.
8. 3.5 pulls my totals from 3.2 to 3.4, counts confirmed plus agreed income, and
   says "not complete yet" when something is unknown.
9. 2.1 works out the share of my week I decide myself (37 of 112 hours → 33%).
10. 4.2 lists my must-haves from 1.4 and my option names from 4.1.
11. Admin shows progress, feedback and questions; answers only with consent.
12. A question reaches info@maderealblueprint.com and appears in Admin.
13. Step 2 cannot be opened from the overview, by address, or by its print page.
14. Dark, light and follow-my-device all work, survive a reload with no flash,
    and print on white.
15. No key reaches the browser; a stranger with the public key can read nothing.

---

## 6. To build next

### 6.1 A bottom tab bar on phones
**Why.** The app is mostly used on a phone, and the links sit at the top, out of
thumb reach, scrolling away as soon as someone starts reading. A fixed bar at the
bottom is how people expect to move around a phone app.

**What it is**
- A fixed bar at the bottom of the screen, **phones only** (below the `sm`
  breakpoint). On a tablet or computer the top links stay as they are.
- Four tabs, each an icon above a short word, with the current one marked in
  Ochre and announced with `aria-current="page"`:
  1. **Overview** — the eight steps.
  2. **Continue** — straight to the page I last had open; the first time, to the
     start of Step 1.
  3. **My notes** — what my AI partner knows.
  4. **Settings** — including Help and Sign out, which leave the top bar.
- **Open question for Mwata:** Help is the one people need when stuck. Is it
  better as its own tab in place of Continue?

**What it must get right**
- The page needs bottom padding equal to the bar, so the last answer box and the
  "Mark as done" row are never covered.
- It respects the iPhone home-bar inset (`env(safe-area-inset-bottom)`).
- It is **not** shown signed out (front door, sign-in), and never printed.
- It must not compete with the "Mark as done" row at the foot of an exercise:
  check the two together on a real phone before releasing.
- Admin stays off the bar: a link on the overview, for Mwata only.
- Icons: simple line icons in the brand's weight. The app has no icon set yet,
  so one has to be drawn or chosen; the mark in `brand.tsx` sets the style.
- Works in light and dark, and at the largest text size a phone can set.

**Done when:** on a phone I can reach every main place with my thumb without
scrolling, nothing is hidden behind the bar, the current place is obvious, and
the computer layout is unchanged.

### 6.2 Also waiting
- **Video addresses** for the per-part slots (they say "being recorded").
- **Founding-member support**, when the course sells without meetings: a flag per
  person in Admin, so Help can offer the right thing to each.
- **Step 2 Explore**: open it when its workbook is final, and align its money
  page, which still says "count only the income you have evidence for".
- **Supabase Pro** before the first paying customer: the free plan keeps no
  backups and pauses after about a week idle.

## 7. Deliberately not in scope
Steps 3 to 8 (until written), modules, payments inside the app (Lemon Squeezy
handles buying), a community, mobile apps, voice, notification emails.

## 8. Practical limits
- Free tiers where they are enough. Anthropic is the only real running cost;
  Admin shows an estimate per person.
- Supabase in an EU region.
- The code folder sits inside OneDrive, which occasionally locks a file during a
  local build. Moving `web/` out one day would remove that.
