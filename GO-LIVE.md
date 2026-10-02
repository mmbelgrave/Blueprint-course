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
| `NEXT_PUBLIC_INVITE_ONLY` | type `true` |

Now press **Deploy**. After a few minutes you get an address such as
`blueprint-course.vercel.app`. Write it down; step 3 needs it.

> If you ever change one of these values, press **Redeploy**. Some of them are
> baked in when the app is built.

## 2b. Supabase: switch on the picture store (once)

The vision board on 1.2 keeps people's pictures in a private store that does not
exist yet. Supabase → **SQL Editor → New query** → paste the contents of
`web/supabase/storage.sql` → **Run**. It is safe to run again.

Without this step everything else works, but adding a picture gives an error.

## 3. Supabase: let the new address sign people in

Magic links only work for addresses Supabase knows.

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL**: `https://your-address.vercel.app`
3. **Redirect URLs**: add `https://your-address.vercel.app/auth/callback`
   (keep `http://localhost:3000/auth/callback` so your computer still works).

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
| Sender email address | **an address on a domain you verified in Resend** |

**The sender address is where this goes wrong.** Resend refuses to send from a
hotmail.com or gmail.com address, and Supabase then reports "Error sending magic
link email", which a person reads as "Something went wrong". Use
`onboarding@resend.dev` to test (it only reaches your own Resend account
address), and your own verified domain for real people.

## 6. The code in the email

Once custom SMTP is on, Authentication → Emails → **Templates → Magic link or
OTP** can be edited. The body needs the code, because a mail scanner (Outlook
Safe Links) opens a link before the person does and uses it up:

```html
<p>Your code: <strong>{{ .Token }}</strong></p>
<p>Or click this link: <a href="{{ .ConfirmationURL }}">Sign in</a></p>
```

How long the code is comes from Authentication → Sign In / Providers → Email →
the OTP length setting (6 to 10 digits; this project sends 8). The app takes the
code whatever its length, so you can change that setting freely.

The **Invite user** template still carries only a link. So do not invite people
from the dashboard: let them sign in themselves, or add them under Users and
tell them to sign in. Both routes use the email above, with the code.

## 7. Check it yourself

Sign in on the real address and walk through:
sign in by email · consent screen · a page of Step 1 · your AI partner answers ·
mark a page done · **What my AI partner knows** shows a note · "Forget this" ·
"Help me draft this" on a summary page · the print page · **Admin** (only you).

Then tell people the address. They sign themselves in.

---

## Later

- **Your own address**: Vercel → Settings → Domains → add e.g.
  `blueprint.yourdomain.com`. Then repeat step 3 with the new address.
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
