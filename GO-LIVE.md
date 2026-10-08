# Putting the Blueprint online

Everything in the app is ready. What is left are the parts that need your own
accounts: Vercel (the web address), Supabase (who may sign in, and the emails)
and your keys. This page is the order to do them in.

Keys are never written in this file, never in the code, and never in a chat.
They live in `web/.env.local` on your computer and in Vercel's own settings.

---

## 1. Vercel: make the web address

Vercel runs the app and gives it an address. The free plan is enough to start.

1. Go to **vercel.com** and choose **Continue with GitHub**. Allow it to see your
   account. (Vercel only sees what you let it see.)
2. **Add New… → Project**, then **Import** `mmbelgrave/Blueprint-course`.
   A private repository is fine.
3. One setting matters: **Root Directory**. Click **Edit** and choose the folder
   **`web`**. The app lives in that folder, not in the top one.
   Framework "Next.js" is found by itself. Leave the build commands alone.
4. Do **not** press Deploy yet &mdash; first add the settings in step 2.

## 2. Vercel: the settings the app needs

Still in the import screen (or later under **Settings → Environment Variables**),
add these seven. Copy each value from your own `web/.env.local` file.

| Name | Where the value comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (secret) |
| `ANTHROPIC_WORKSPACE_ID` | only if your key sits outside a workspace |
| `ADMIN_EMAIL` | the address you sign in with, so you get the Admin page |
| `RESEND_API_KEY` | Resend → API keys (secret). Without it, questions from the Help page are saved but no email reaches you |
| `NEXT_PUBLIC_INVITE_ONLY` | only if you close sign-up (step 4); leave it out while anyone may start an account |

Now press **Deploy**. After a few minutes you get an address such as
`blueprint-course.vercel.app`. Write it down; step 3 needs it.

> If you ever change one of these values, press **Redeploy**. Some of them are
> baked in when the app is built.

## 2a. Supabase: the tables

`web/supabase/schema.sql` holds every table. It is safe to run again, and it
only creates what is missing — so after a change like the **questions** table
(3 October), paste it into **SQL Editor → New query** and run it. Supabase warns
that the script is "potentially destructive" because it re-creates the access
rules; it only touches this app's own tables.

## 2b. Supabase: switch on the picture store (once)

The vision board on 1.2 keeps people's pictures in a private store that does not
exist yet. Supabase → **SQL Editor → New query** → paste the contents of
`web/supabase/storage.sql` → **Run**. It is safe to run again.

Without this step everything else works, but adding a picture gives an error.

## 3. Supabase: let the address sign people in

Supabase only signs people in at addresses it knows. This is done, and this is
how it stands:

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL**: `https://app.maderealblueprint.com`
3. **Redirect URLs**: `https://app.maderealblueprint.com/auth/callback`
   (and `http://localhost:3000/auth/callback` so your computer still works).

Do this again if the address ever changes.

## 4. Supabase: who may start an account

Authentication → **Sign In / Providers → Email** → **Allow new users to sign up**.

- **On** (how it stands now): anyone who knows the address types their email,
  gets a code by email, and the account is made for them. Nothing for you to do
  per person. Anyone who finds the address can also start one, and each person
  can spend AI credit — the app limits them to 80 messages and 20 drafts a day.
- **Off**: only people who already have an account can get a code. You then add
  each person yourself under **Users → Add user** (tick **Auto Confirm User**).

If you switch it off, also set `NEXT_PUBLIC_INVITE_ONLY=true` in Vercel and
redeploy, so the app says "this address cannot start an account right now"
instead of a vague error. With sign-up open, leave that setting out entirely.

## 5. Sending email: the trap that costs an afternoon

Supabase's own sender is for testing: a handful of emails an hour, and it will
not let you change the email text. Both of those block a real launch, so set up
Resend (free) under Authentication → Emails → **SMTP Settings**:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email address | `info@maderealblueprint.com` |
| Sender name | `The Life You Choose` |

**The sender address is where this goes wrong.** Resend refuses to send from a
hotmail.com or gmail.com address, and Supabase then reports "Error sending magic
link email", which a person reads as "Something went wrong". The sender has to
sit on a domain that is verified in Resend.

`maderealblueprint.com` was verified on 3 October: Resend → Domains → Add, then
its three records at Hostnet (one TXT named `resend._domainkey`, two CNAMEs
named `rsend` and `send`), then **Verify DNS Records**. The address is
`info@` and not `noreply@` on purpose: someone stuck at the door replies to
that email, and a no-reply address throws the reply away.

**A record that looks missing may not be.** Asking for a name before it exists
makes a computer remember "no such name" for up to an hour, so it keeps saying
missing long after the record is live. Ask the domain's own nameservers
(`ns01.hostnet.nl`) instead; they keep no such memory.

## 6. The code in the email, and why there is no link

Once custom SMTP is on, Authentication → Emails → **Templates → Magic link or
OTP** can be edited. The body carries the code and nothing else:

```html
<h2>Your sign-in code</h2>
<p>Type this code in the app to sign in:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>The code works for one hour. If you did not ask for it, you can ignore this email.</p>
```

**Never put `{{ .ConfirmationURL }}` back in.** Supabase issues one token per
email, and the link and the code are two faces of it. Outlook Safe Links opens
the link the moment the mail arrives, which uses the token up — and the code in
the same email dies with it. Proved on 2 October: open the link, then type the
code, and Supabase answers "Token has expired or is invalid". Both of Mwata's
failed sign-ins were this, not a broken code.

How long the code is comes from Authentication → Sign In / Providers → Email →
the OTP length setting (6 to 10 digits). The app takes the code whatever its
length, so that setting can change freely.

### There are two templates, not one

**Magic link or OTP** is only sent to an address that already has an account.
A brand-new address — every real new customer, and every test of `/free` —
gets **Confirm sign up** instead, which is a different template with its own
body. Found on 8 October, when a sign-up produced a link email although the
magic-link template had carried the code since 2 October.

Give **Confirm sign up** the same body, so nobody is ever sent a link:

```html
<h2>Your sign-in code</h2>
<p>Welcome. Type this code in the app to finish signing up:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>The code works for one hour. If you did not ask for it, you can ignore this email.</p>
```

Subject: **Your sign-in code**.

The app takes either kind of code: it asks Supabase for an "email" token first
and a "signup" token second, because the person typing it cannot know which
they have.

The **Invite user** template still carries only a link, so do not invite people
from the dashboard: let them sign in themselves, which uses the email above.

## 7. Questions from people

**Help** in the menu, and "Ask Mwata" beside the AI partner on every exercise
page. Someone picks what the question is about (a step, the app, meetings, payment), writes it, and it is answered by email. Coming from an
exercise page, the step and the page are filled in already.

A question goes two ways at once:

- **Into the database**, so it is never lost and shows on the **Admin** page
  under that person, with their progress beside it.
- **Into your inbox** at `info@maderealblueprint.com`, through Resend, with
  their own address as reply-to. Pressing Reply answers them directly.

The email needs `RESEND_API_KEY` (step 2). Without it nothing breaks: the
question is still saved, and Admin says plainly at the top that no email is
being sent.

The address comes from `web/src/lib/support.ts`; change it in that one file if it
ever changes.

**Answers go by email only**, decided 6 October. Lemon Squeezy does not allow
services, and answering questions about someone's own plans on WhatsApp reads as
coaching. Help stays for questions about the course, a download or an order. Any
meetings are sold and booked outside the course area, never inside it.

Everyone who signs in can ask. When the course sells without meetings, a flag
per person is the next step, so Help can offer the right thing to each — not
needed while the first 12 are all founding members.

## 7b. Video (Bunny Stream)

One **bunny.net** account. Inside it, a **Stream video library** — there is no
second account to make. The library gives you three things, and a fourth once
you make it private:

A Bunny library has **three different keys**, and the app needs only one of
them:

| Key | What it is for | Does the app need it? |
| --- | --- | --- |
| **API key** | Uploading, changing and **deleting** videos | **No.** You upload in the Bunny dashboard. A key that can delete your videos has no business sitting in a web app |
| **Read-only API key** | Reading video details, and signing Bunny's webhooks | Not yet. Only if the app one day fills in lengths and thumbnails by itself |
| **Token authentication key** | **Signing playback addresses** | **Yes — this is the one** |

| Setting | Where in Bunny |
| --- | --- |
| `BUNNY_TOKEN_KEY` | **Stream → your library → Security → General**, at the foot: *Token authentication key* |
| `BUNNY_LIBRARY_ID` | Stream → your library → API (it is also in the dashboard address) |
| `NEXT_PUBLIC_BUNNY_CDN` | Stream → your library → Delivery: the pull zone hostname |

The library id and the hostname are not secrets: they are half of every playback
address. The token key is, and it is what makes an address work for a few
minutes only, for someone who owns the step.

**Security → General has two token switches, and we need the second one:**

- *Embed view token authentication* protects **Bunny's own embedded player**,
  which this app does not use.
- **CDN token authentication** protects **the video files themselves**. Our
  player asks the CDN for them directly, so this is the one to turn on.

Turn it on once the first real video is up and playing. While it is off nothing
is exposed that is not meant to be, because no videos exist yet.

**Allowed domains blocks more than you think.** With it set, a request that
carries **no referer at all** is refused however good its token — which is how
a video can be perfectly set up and still refuse to play from a script, a test
or a preview build. Put all of these in the list, not only the live address:

- `app.maderealblueprint.com` — the app
- `localhost:3000` and `localhost:3001` — your own computer. **The port is part
  of the match**, whatever the documentation says: tested on 6 October,
  `localhost` was allowed and `localhost:3000` was refused by the same list
- `*.vercel.app` — the branch previews. Each preview deployment gets its own
  hostname, so the wildcard is the only entry that keeps working

The list is not a replacement for the token — a referer is easy to fake — but it
costs nothing and it catches casual copying.

**In Vercel**, add all three to **Production and Preview**. Preview is where the
branch is tested, so leaving it out means the next version cannot play anything.
Development is not needed: `web/.env.local` covers your own computer.
`NEXT_PUBLIC_BUNNY_CDN` cannot be marked secret, and should not be — anything
beginning `NEXT_PUBLIC_` is compiled into the page and the browser can read it.
That is why it is the hostname and not the key.

**Proving it works.** After turning CDN token authentication on, upload one
short video and run, from the `web` folder:

```bash
node scripts/bunny-check.mjs THE-VIDEO-ID
```

It signs an address both ways Bunny documents, tries each against the real CDN,
and says which one your library accepts. It also checks that an address with no
token is refused — if that one succeeds, the videos are not protected. Your key
is never printed and never leaves your computer.

**The sound-only files go in the same video library.** Bunny Stream takes MP3 and
WAV as well as video, so an audio version is uploaded beside its video and
carries the same signing and the same player. No Storage zone is needed.

The sound-only files (an MP3 per lesson, drawn from the finished video) live in
a **Storage zone**, not in Stream.

**Adding these in Vercel:** Settings → Environment Variables → Add, one at a
time, all environments, then **Deployments → the latest → Redeploy**. The three
secrets are never written into the code or into this file. Add the same lines to
`web/.env.local` to work on your own computer.

## 7c. Free accounts, and the day you switch buying on

The link to share is **app.maderealblueprint.com/free**. You can add where you
shared it: `/free?from=instagram`, `/free?from=website`. Admin then shows it
under each person. Anything else in that word is thrown away, so the link is
safe to paste anywhere.

A free account opens the Introduction, the Ordinary Tuesday (page 1.2) and the
first lesson of Step 1. That list lives in `access.json` under `free`, not in
the code, so it can be changed without touching the app.

**Today none of this does anything**, because buying is not required yet:
everyone signed in may open everything. The switch is one setting in Vercel:

    NEXT_PUBLIC_REQUIRE_PURCHASE = true      (Production and Preview)

**Do this first, or people lose what they have.** Anyone who is already using
the app has bought nothing in the app, so the moment you switch this on they
become a free account. Before you touch the switch:

1. Open **Admin**, find each person who should keep the course.
2. Under their name, press **Give: Phase 1 · Choose it** (it is marked
   "complimentary", so you can tell it from a real order later).
3. Check Michael first. Then switch the setting on and **Redeploy**.
4. Open the app yourself and check that Step 1 is still there for him.

To put it back, remove the setting and redeploy. Nothing anyone wrote is ever
touched by this: closing a step hides it, it does not delete it.

**What a free account sees.** Two places along the bottom, Modules and
Settings. Inside Modules: the free material, the Introduction, and Phase 1 with
the free lesson and the free exercise in it. No steps, no progress bars, no AI
partner and no picture board — so it costs you nothing in AI, and nobody is
asked to agree to things that do not happen to them. Admin still shows which
accounts are free and where they came from.

## 7d. The workbook PDFs

They live in a private Supabase store called **workbooks**, uploaded through
Storage in the dashboard, with the exact names `modules.json` gives:
`introduction.pdf`, `step-1.pdf`, `step-2.pdf`, `free-ordinary-tuesday.pdf`.

**That store has no access rules at all, on purpose.** Unlike the picture store,
nobody can read it with their own account - not even a paying member. Every
link is signed by the server in `/api/workbook`, and only after that route has
decided this person may have this file. A storage rule would have to let every
signed-in person read every workbook, which is the opposite of what the access
layer is for. The server needs `SUPABASE_SERVICE_ROLE_KEY` for this, which it
already has.

If a download ever fails, look in the Vercel logs for `workbook: could not
sign a link`. The two likely causes are a name in `modules.json` that does not
match the file in the store, and a missing service-role key.

## 8. Check it yourself

Sign in on the real address and walk through:
sign in by email · consent screen · a page of Step 1 · your AI partner answers ·
mark a page done · **What my AI partner knows** shows a note · "Forget this" ·
"Help me draft this" on a summary page · the print page · **Admin** (only you).

Then tell people the address. They sign themselves in.

---

## Before the first paying customer: Supabase Pro

Decided 2 October 2026. The free plan has **no backups** and **pauses the
project after about a week without use**. Answers live in one place only, so a
mistake or a corruption would have nothing to restore from, and a paused project
means nobody can sign in until someone clicks restore in the dashboard.

Supabase Pro (about $25 a month) adds daily backups and removes the pausing.
Mwata moves to Pro when the course goes on sale. A friend testing meanwhile is
fine: what he writes is in the database, tied to his account, on every device.

## Later

- **The address**: `app.maderealblueprint.com` (Vercel → Settings → Domains).
  The old `blueprint-course.vercel.app` permanently redirects to it and keeps
  the path, so a link written down earlier still arrives.
- **Closing the door again**: set `NEXT_PUBLIC_INVITE_ONLY` to `true` and switch Supabase
  sign-ups back on. Only do this when you are ready to pay for whoever walks in.
- **Privacy text**: `/privacy` names Belgrave Management, Unipessoal Lda and
  info@belgraveconsultancy.com, as the website privacy note does. Keep the two
  in step when either changes.
- **The code folder is inside OneDrive.** That is fine for GitHub, but builds on
  your own computer sometimes fail on a locked file. Moving `web/` out of
  OneDrive one day would remove that.

## What it costs

- Vercel: the free plan is enough to start.
- Supabase: the free plan is enough; keep an eye on the database size. Resend is
  free up to 3,000 emails a month, which is plenty for sign-in codes.
- Anthropic: the only real cost. Each person is limited to 80 AI messages and
  20 drafts per day. The **Admin** page shows an estimate per person; your
  Anthropic Console shows the exact bill.
