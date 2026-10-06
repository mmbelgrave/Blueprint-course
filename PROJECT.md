# The Made Real Blueprint — the app

**Specification, version 4 · 6 October 2026.** This file says what the app is
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
  members doing Phase 1; the app does not yet know who bought what. That changes
  with §6.1: buying on Lemon Squeezy creates the account and opens the steps
  bought.
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
| Buying | Lemon Squeezy (seller of record), webhook into the app (§6.1, to build) |
| Video | A streaming service, played inside the app (§6.4, to build) |
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
already filled in. Answers come by email only: the shop does not allow
services, and answering someone's own plans on WhatsApp reads as coaching. Two
ways out, both carrying the same opening line: the form and an email link. A question is **saved first and emailed second**, so it survives a failed
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

In this order. 6.1 to 6.6 come before the app is part of what people buy;
6.7 to 6.10 can follow once the first founding members are using it.

### The build order (Product Manager, 6 October)
Work happens on the branch `next-version`. The live app only ever builds from
`main`, so nothing here can disturb someone working. Each slice is finished,
reviewed and tried before the next one starts.

| Slice | What | Why this order |
| --- | --- | --- |
| **1** | The access layer (§6.0), the `entitlements` table, granting and revoking by hand in Admin | Everything else gates on it, and granting by hand opens steps for testers today |
| **2** | Steps 2 and 3 content when the workbooks arrive (10–11 Oct) | §6.10: both must be in the app before anyone buys. The real gate on selling |
| **3** | The course area (§6.3), the Introduction (§6.3a), workbook PDFs | Gives every step a home with its video, workbook and exercises |
| **4** | Free access (§6.2) and the `/free` page | Needs 1 and 3; the sharing link Mwata has been waiting for |
| **5** | Purchases (§6.1), proved in Lemon Squeezy test mode | Needs 1; cannot be finished until the store clears identity review |
| **6** | Video (§6.4), once Mwata approves Bunny and the own player | Biggest single piece; the videos do not exist yet either |
| **7** | The tab bar (§6.9) | Best once the places it points at exist |
| **8** | The smaller ones: Help by email only (§6.10), feedback per page (§6.7), download my answers (§6.6), the phase blueprint (§6.5), the partner seat (§6.8) | Independent of each other; fill gaps between the larger slices |

**Help by email only (§6.10) is ready to go now** and is also a correction to
what is live: it can be taken to `main` on its own, the day Mwata says so.

**Not started until approved:** video (§6.4, the proposal above), and anything
that spends money.

### 6.0 One access layer
Three different questions decide whether a person may open something, and they
must be answered in one place or they will disagree with each other:

1. **Is it released?** (§3.3 — Step 2 is written but closed.)
2. **Is it free?** (§6.2 — `access.json`.)
3. **Does this person own it?** (§6.1 — their entitlements.)

One function answers all three for a step, a page, a workbook PDF, a video and a
print page, and every door uses it: the overview, the step page, a page inside a
step, a PDF link, a print page and the API routes. A page must never be open by
one rule and shut by another.

### 6.1 Purchases and access
**Why.** Buying happens on Lemon Squeezy (the seller of record). The app has to
know who bought what, open the right steps for them, and close them again after
a refund, without Mwata adding anyone by hand.

**What it is**
- **A webhook** at `/api/lemonsqueezy/webhook` that receives `order_created` and
  `order_refunded`.
  - Every request is checked against the signing secret (`X-Signature`, HMAC
    SHA-256 of the raw body). Unsigned or wrong: rejected, nothing written.
  - **The same order never counts twice.** Lemon Squeezy can send a message
    more than once; the order id is the key, so a repeat changes nothing.
  - Test and live have **separate secrets and keys** (`LS_WEBHOOK_SECRET_TEST`,
    `LS_WEBHOOK_SECRET_LIVE`). A test order (`test_mode: true`) is stored as a
    test, and never opens anything in the live app unless
    `ALLOW_TEST_ORDERS=true`.
- **On a new order**
  1. Find the account with the order's email, or create one (Supabase admin,
     email already confirmed). A founding member who signed in before keeps
     everything they already wrote.
  2. Add an **entitlement**: which product, order id, amount and currency paid,
     date, test or live. Products are recognised by their Lemon Squeezy variant
     id, set in configuration (`LS_VARIANT_PHASE1`, later `LS_VARIANT_FULL`),
     never written into the code.
  3. Send a **welcome email** (Resend): your workbooks are ready, sign in at
     app.maderealblueprint.com with this email address. It carries no sign-in
     link and no code (the rule in §3.1 still holds).
- **On a refund** the entitlement is marked refunded and the steps close. The
  person's answers stay until they delete them themselves, and Admin shows the
  refund.
- **New table `entitlements`**: person, product, order id, variant id, amount
  paid, currency, status (active, refunded), test or live, created, ended.
  Row-level security: a person reads only their own; only the server writes.
- **A signed-in person without a purchase** has free access (§6.2): the free
  pages are open, everything else is locked.
- **"Bought but no access?"** on the locked overview and in Help: the person
  types the email they paid with, a code goes to that address, and once it is
  typed in, the purchase moves to the account they are signed in with. This
  covers a different email at checkout, and a webhook that never arrived.
- **Admin:** each person shows what they own and from which order; Mwata can
  **grant** access by hand (for test persons, marked "complimentary") and
  **revoke** it. A list of webhook messages received, with any that failed.
- **The upgrade credit.** When the whole Blueprint opens, the entitlement
  already holds what each person paid for Phase 1, so a personal discount for
  that amount can be made without searching through orders.

**Where it stands (6 October):** the store is **still in identity review**, so
only test-mode orders exist. Everything here is built and proved against test
mode; the live secret is added, and one real low-value order run through, on the
day the store is approved. Nothing can open the live app before then.

**Done when:** a test purchase in Lemon Squeezy creates the account, opens
Phase 1 and sends the welcome email within a minute; sending the same message
again changes nothing; a test refund closes Phase 1 and keeps the answers; a
purchase with another email can be claimed; a test order does not open the live
app.

### 6.2 Free access
**Why.** Not everyone is ready to buy. A free account lets people try the
method, get to know the app, and buy later from inside it. It also replaces
sending the free exercise by hand.

**What it is**
- **A sign-up link to share** on the website, Instagram, Facebook and in
  messages: `app.maderealblueprint.com/free`. It leads to a short page (what you
  get for free, in two or three lines) and the normal sign-in with a code
  (§3.1). Signing in there creates an account with **free access**.
- The link can carry where it was shared (`?from=instagram`, `?from=website`
  …). The app stores it with the account, so Admin shows where people came from.
- **What free access opens** is set in `access.json` — page ids and course
  items, never in the code, and deliberately not inside the workbook content, so
  changing what is free cannot disturb the content check (§3.3). To start with:
  1. **The Introduction** (§6.3a): the welcome video and the Introduction
     workbook as a PDF;
  2. **1.2 A normal day in your new life** (the Ordinary Tuesday), with its
     vision board;
  3. the **Step 1 video**, so people meet Mwata before they buy.
- Everything else shows a lock with one line on what it holds and a button,
  **Get Phase 1**, to the website's options section.
- **Updates:** the sign-up page has its own unticked box, "Send me an occasional
  update when something new is ready". Signing up is not the same as
  subscribing. **For now the app only records the tick** and Admin can export the
  addresses; connecting MailerLite is a later, small piece of work (decided
  6 October), which keeps a third party out of the privacy notes until it earns
  its place.
- **The AI partner** works on the free pages too, with a lower daily limit
  (`FREE_PARTNER_DAILY_LIMIT`, suggested 15 messages, no drafts), so a free
  account cannot run up real cost. Admin shows AI cost for free and paying
  accounts separately.
- **When a free member buys**, the purchase finds their account by email
  (§6.1) and the rest opens. Everything they already wrote stays where it is.
  If they paid with another email, "Bought but no access?" connects it.
- **Protection against misuse:** sign-up is limited per email and per network
  address, and the code rules of §3.1 still apply. `NEXT_PUBLIC_INVITE_ONLY`
  still closes the door if needed.
- **Admin:** a count and list of free accounts, where they came from, what they
  did on the free pages, and who went on to buy.

**Done when:** someone with the link can sign up with a code, use the free pages
and the AI partner within the free limit, cannot open any other page by its
address, PDF or print page, and after a test purchase with the same email sees
Phase 1 open with their free answers still there.

### 6.3 The course area: phases and steps
**Why.** A buyer gets three things per step: a video, a workbook and the
exercises. They should find all three in one place.

**What it is**
- **The overview** shows the three phases (Choose it, Build it, Live it) with
  their steps. Open and owned steps show progress; owned but not yet released
  steps say "coming soon"; steps the person does not own show a lock.
- **A step home page** (`/step/<n>`) before the first exercise, with:
  1. **The step video** (see 6.4), with its length.
  2. **The workbook** as a PDF download, showing "Updated on <date>". The newest
     version is always the one served.
  3. **Open the exercises**, or **Continue where I stopped** when started,
     straight to the right page.
  4. Progress per part, and the step result (e.g. My Working Direction) once
     it has been written.
- The **video slot per part** (§3.4) stays for shorter part videos; an empty
  slot is simply not shown, instead of saying "being recorded".
- **Workbook PDFs** live in a private Supabase Storage folder. A download is a
  signed link that lasts a few minutes, made only for someone who owns the step.
  File names follow the revision scheme (Rev.01, 01a …); the step lists only the
  current one.
- The "Read this first: how this app works" link stays at the top.

**Done when:** from the overview, I can reach the video, the PDF and the
exercises of any step I own in one tap each; a step I do not own cannot be
reached by its address, its PDF link or its print page (as with Step 2 today).

### 6.3a The Introduction
**Decided 6 October.** The Introduction is part of the course, but it is not a
set of exercises: it is **a welcome video and the Introduction workbook**. It
comes before Step 1 and is built as a course item of the same shape as a step
home page (§6.3), with its video and its PDF, and no exercises of its own.
**Your First Picture stays where it is**, as 0.1 inside Step 1.

On the overview it sits above the three phases, as the way in. It is free
(§6.2), so anyone signed in can watch the welcome video and read the workbook.

### 6.3b "How this app works" needs rewriting
The guide at the top of the overview explains the exercises and nothing else.
With workbooks to download, videos to watch, free and bought steps, a tab bar
and a light-or-dark choice, it has to explain the app as a whole: what you get
per step (video, workbook, exercises), **how to download a workbook**, how the
AI partner works and what it remembers, where your results and PDFs are, how to
ask a question, and how to change how the app looks. Mwata approves the wording
before it goes in, as with all content.

### 6.4 Video
**Can video live inside the app?** It can be stored in the app's own storage and
played with the browser's video player, but that is the weak choice: a phone on
a slow connection gets the full-size file, there is no quality that adjusts to
the connection, every view counts against the hosting allowance, and the file
is easy to copy.

**Approved 6 October**, including a **sound-only version of each lesson**.
Watching is the point, so the video is always what is offered first; listening
is there for the walk, the drive and the kitchen, and for the phone whose screen
is locked.
**Bunny Stream for hosting, and the app's own player (Video.js 10) on top**, not
Bunny's embedded player. Bunny is an EU company with EU storage, free encoding
and signed HLS links, and at this size costs under €1 a month at twelve buyers
and under €10 at two hundred — Cloudflare Stream's per-minute-delivered price
punishes rewatching, and Mux costs more than both for analytics this project
does not need. The player has to be the app's own because an embedded iframe
cannot survive a change of page, which the mini-player below requires, and
cannot report position accurately enough to resume to the second. Video.js 10 is the player: Vidstack was chosen first
and deprecated in favour of it the same day, so the move was made before any
content existed. Video.js does not set Media Session metadata by itself, so the
app does, or a locked phone would show nothing while the sound-only version
plays.

**The honest limit, from the review:** background audio with the screen locked is
**not** reliable on an iPhone — a normal Safari tab does better than an app added
to the home screen, where Apple suspends playback after about thirty seconds. So
the app never promises background listening. Picture-in-picture and the in-app
small player do work.

**Sound only.** Each lesson also exists as an audio file, offered as "Listen
instead" beside the video and as a "Listen" button on the player itself. It
shares the video's id, so a person can watch half a lesson at home, listen to
the rest in the car, and the place is the same either way; finishing one counts
as finishing the lesson. Listening always uses the small player, because the
point of it is to be doing something else.

Bunny Stream makes no sound-only version by itself, so each one is an MP3 drawn
from the finished video — but it is uploaded to the **same video library**,
which accepts MP3 and WAV, so it carries the same signing and plays in the same
player. It is named in the content beside the video address. Subtitles still matter as much: someone on
a train with no headphones has neither.

**Choice:** host the videos on a **video streaming service** and play them
**inside the app**, in its own player. The person never leaves the app or sees
another brand. Bunny Stream (EU company, EU storage, low cost at this size,
signed links) is the starting suggestion; Mux and Cloudflare Stream are the
alternatives.

**The developer first reviews the player and the service**, and brings Mwata a
short proposal (which service, which player, what it costs per month at 12 and
at 200 buyers, and what was tested on a real iPhone and a real Android phone)
before anything is built. The review must cover these points:

- **It remembers where I was.** The position is saved per person per video
  every few seconds and when the app goes to the background, **on the server**,
  not only in the browser. Switching to another app, locking the phone, closing
  the tab, a new release (§3.13) or picking up on another device all continue
  at the same second. A video started before shows "Continue at 4:12" and
  "Start again".
- **It keeps playing while I do something else.**
  - *Inside the app:* the video stays where it is put. **Scrolling never moves
    it**, which was the first thing Mwata noticed and disliked. A **Pop out**
    button on the player hands it to the corner, where it keeps playing while he
    moves around the app, and puts it back again. Listening does the same, since
    a picture is beside the point then. Walking away from a video without asking
    for either simply stops it, with the place kept for next time.
  - *Outside the app:* **picture-in-picture** (a small floating window on top
    of other apps), and lock-screen and notification controls (play, pause,
    skip 10 seconds) through the browser's media controls.
  - *Known limit to check:* a web app on an iPhone may pause when it goes fully
    to the background with the screen off; the YouTube app can do this because
    it is a native app (and only with YouTube Premium). The review says plainly
    what works on each phone, and whether an **audio-only** version of each
    video is worth offering for listening on the go.
- **It does not lose its place** when the phone is turned sideways, when going
  full screen and back, or on a short loss of signal.
- **Adjusts to the connection** (adaptive streaming), starts quickly on mobile
  data, and offers playback speed (0.75× to 2×).
- **Subtitles:** English on every video (most viewers speak English as a second
  language); Dutch where available. The HeyGen scripts are the source text.
  Subtitles stay on once someone turns them on.
- **Accessible:** keyboard and screen-reader controls, and it works in light and
  dark.
- **Secure:** playback links are signed and short-lived, made only for someone
  who owns the step (or for free videos, anyone signed in).
- A video address, and the sound-only address beside it, are stored per step
  (and optionally per part) in the content, not in the code.
- The streaming service is added to the app's privacy page and the website's
  privacy note before the first video goes live.

**Done when:** a video starts within a few seconds on a phone on mobile data,
has English subtitles, continues at the same second after switching apps,
locking the phone or changing device, keeps playing in the small player while I
move to the exercises, plays in picture-in-picture, lets me switch to sound only
without losing my place, and cannot be played by someone who does not own the
step.

**What Bunny needs (set up by Mwata, keys never pasted into the code):** one
bunny.net account, with a **Stream video library** created inside it — there is
no second account. From that library the app needs the **token
authentication key**, which signs playback addresses, plus the **library id**
and the **CDN hostname**, which are not secrets. It does **not** take the
library API key: that one can delete videos, and the app only plays them. A Storage
zone holds the sound-only files. All of it goes into Vercel's environment
variables and `web/.env.local`.

### 6.5 My Blueprint per phase
**Why.** The website promises "you finish with your own blueprint". Each step
already has its own print page (Step 1 My Working Direction, Step 2 My Explore
Summary). The phase deserves one document that brings them together.

**What it is**
- **My Blueprint · Phase 1 · Choose it** (`/phase/1/print`): one document with a
  cover (the person's name and date), then in order: My Working Direction
  (Step 1), My shortlist and what I found (Step 2), My Decision (Step 3), and
  the open items still to check, pulled from the person's own answers.
- The same building blocks as the step print pages, so a change in a step's
  print page shows in the phase document too.
- A step that is not finished shows "Not finished yet" with a link, instead of
  an empty page.
- Saves as PDF through the browser print window, on white, with the copyright
  line, like the step pages.
- Later: **My Blueprint · Portugal** for Steps 1 to 8, once those steps exist.

**Done when:** after finishing Phase 1 I can save one PDF that holds my three
step results in order, with my name, the date and the copyright line.

### 6.6 Privacy additions
- **Download my answers** in Settings: everything the person wrote, their AI
  notes and their purchases, as a readable PDF and as a file (JSON). This
  completes the rights the privacy note already promises.
- **The website's privacy note** gets a section for the app: Supabase (EU),
  Anthropic, Resend, the video service, and what the AI partner reads. The app's
  `/privacy` and the website must say the same.
- The app's `/privacy` names **info@maderealblueprint.com** (it still shows
  info@belgraveconsultancy.com).
- Refunded or deleted accounts: the entitlement record is kept as long as tax
  law requires for the order (Lemon Squeezy holds the invoice); the answers
  follow the person's own choice.

### 6.7 Feedback on every page
The part feedback (stars and a comment, §3.7) stays. Add a small, optional line
at the foot of each exercise page: **"Was this clear?"** yes / not quite, with a
box for what was missing. Admin lists it by step and page, so Mwata can see
exactly where people get stuck. Founding members give their promised feedback
here, without meetings.

### 6.8 A partner seat
Each purchase may invite **one partner** (the terms allow use with the people
you plan your move with, and many exercises are for couples).
- The buyer types their partner's email in Settings; the partner gets an email,
  signs in with a code, and gets the same steps.
- Each person has their **own account, answers, AI partner and notes**. Nothing
  is shared between them unless a later version adds that on purpose.
- The partner's access ends when the buyer's does (refund), and the buyer can
  remove the partner and invite someone else.
- Their AI use counts in Admin like anyone else's.

### 6.9 How the app is laid out
**Decided 7 October**, from Mwata's sketch. This replaces the earlier tab-bar
section: the bar is not a new way to reach the same pages, it is the shape of
the app.

**Five places along the bottom:**

| | Holds |
| --- | --- |
| **Modules** | The course: videos and workbooks |
| **Exercises** | The workbook in the app, as it is today |
| **Made Real AI** | What my AI partner knows (later, a partner for questions that belong to no page) |
| **Settings** | Settings and signing out |
| **Help** | Asking Mwata a question |

**Modules has three levels.**

1. **What you can open**, by what you own (§6.1): Free material, Step 1, Step 2,
   Step 3, each with its overall progress.
2. **Inside a step**: the parts, each with its title, the thumbnail from its
   video, and its progress.
3. **A part**: the video, the workbook to download, a link **to the exercises in
   the app**, a tickbox for *module completed*, and the lessons that follow.

So two people can use the same course differently: one watches and writes in the
PDF, the other watches and answers in the app. Neither is the odd one out.

**Exercises** keeps today's overview, and from a video the link goes straight to
the part of the step it belongs to.

**Must the video be watched first?** Mwata asked; the answer is **no, order it
rather than lock it**.
- The website promises buyers "the workbooks as PDF downloads" on payment.
  Holding one back until a video has been watched breaks a promise already made,
  and the first support question would be "where is the workbook I paid for".
- Some people read rather than watch, some have a poor connection, and some will
  have watched already on another device. A lock punishes all three.
- What it is really for — making sure the video is seen — is better served by
  putting it first on the page, by letting the tickbox be the obvious next
  thing, and by one line saying the workbook makes more sense afterwards.

**Still to decide before building**
- **Two doors to one course.** Modules and Exercises both lead to Step 1, by
  different routes. The names have to make the difference obvious at a glance,
  and each should link to the other so nobody feels lost between them.
- **Five labels on a small phone.** "Made Real AI" will not fit; "AI" or
  "Partner" will. Worth checking at 375 pixels before it is built.
- **Two kinds of progress.** A module's progress is videos watched; a step's is
  pages done. They will differ, and the overview has to be honest about which it
  is showing.

**What it must get right** (unchanged from the earlier plan): room at the foot of
a page so nothing hides behind the bar, the iPhone home-bar inset, never shown
signed out, never printed, and the current place obvious and announced.

**Done when:** on a phone I can reach every part of the app with my thumb; from
Modules I can watch a video, download its workbook and go to its exercises; and
what I do not own is visibly not mine.

### 6.10 Also waiting
- **Steps 2 and 3**: both workbooks are final the weekend of 10–11 October.
  Then open Step 2 (align its money page, which still says "count only the
  income you have evidence for", with the confirmed-plus-agreed rule) and build
  Step 3 Decide from its workbook in the same way as Step 1. Both must be in the
  app before it is shared with anyone, since Phase 1 buyers pay for all three.
- **Supabase Pro** before the first paying customer: the free plan keeps no
  backups and pauses after about a week idle. With purchases in the database,
  this is no longer optional.
- **Help without WhatsApp (decided 6 October).** Lemon Squeezy does not allow
  services, and personal answers by WhatsApp about someone's own plans look like
  coaching. Help and "Ask Mwata" stay for questions about the course, a download
  or an order, **answered by email only**: the WhatsApp choice and the WhatsApp
  link are removed, and the form and email link stay. Any future meetings are
  sold and booked outside the course area (Belgrave, Stripe, TOConline), never
  inside it.

## 7. Deliberately not in scope
Steps 4 to 8 (until written), modules, payments inside the app (Lemon Squeezy
handles buying), booking or paid meetings inside the course area, a community,
mobile apps, voice, notification emails (apart from the welcome email in §6.1
and the partner invitation in §6.8). Also left for later: progress statistics
across people, and a personal watermark on the PDFs.

## 8. Practical limits
- Free tiers where they are enough. Anthropic is the only real running cost;
  Admin shows an estimate per person.
- Supabase in an EU region.
- The code folder sits inside OneDrive, which occasionally locks a file during a
  local build. Moving `web/` out one day would remove that.
