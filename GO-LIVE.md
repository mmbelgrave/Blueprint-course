# Putting the Blueprint online (pilot)

Everything in the app is ready. What is left are the parts that need your own
accounts: Vercel (the web address), Supabase (who may sign in, and the emails)
and your keys. This page is the order to do them in.

Keys are never written in this file, never in the code, and never in a chat.
They live in `web/.env.local` on your computer and in Vercel's own settings.

---

## 1. Vercel: make the web address

Vercel runs the app and gives it an address. The free plan is enough for a pilot.

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

## 3. Supabase: let the new address sign people in

Magic links only work for addresses Supabase knows.

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL**: `https://your-address.vercel.app`
3. **Redirect URLs**: add `https://your-address.vercel.app/auth/callback`
   (keep `http://localhost:3000/auth/callback` so your computer still works).

## 4. Supabase: close the door to strangers

The address is on the open internet. Without this step anyone who finds it can
make an account and spend your Anthropic credit.

1. Supabase → **Authentication → Sign In / Providers → Email**.
2. Switch **Allow new users to sign up** *off*.
3. Save.

Together with `NEXT_PUBLIC_INVITE_ONLY=true` this means: only people you invite
can get in. Anyone else sees "This email is not on the list yet."

## 5. Supabase: invite the pilot people

1. Supabase → **Authentication → Users → Invite user**.
2. Type the person's email. They get an email with a link. That link makes their
   account; from then on they sign in from the app's own sign-in page.
3. Invite **yourself first** and walk through the app before you invite anyone else.

## 6. The email limit (do this before you invite more than one or two)

Supabase's built-in email sender is only meant for testing: a handful of emails
per hour for the whole project. With more pilot people, invitations and sign-in
links will silently not arrive.

Fix it once: make a free account at **resend.com**, verify a domain (or use the
one they give you), then Supabase → **Project Settings → Authentication → SMTP
Settings** → switch on **Enable Custom SMTP** and paste Resend's host, port, user
and password. Now email is normal and the limit is gone.

## 7. Check it yourself, then invite

Sign in on the real address and walk through:
sign in by email · consent screen · a page of Step 1 · your AI partner answers ·
mark a page done · **What my AI partner knows** shows a note · "Forget this" ·
"Help me draft this" on a summary page · the print page · **Admin** (only you).

Then invite your pilot people.

---

## Later, when the pilot goes well

- **Your own address**: Vercel → Settings → Domains → add e.g.
  `blueprint.yourdomain.com`. Then repeat step 3 with the new address.
- **Open sign-up**: set `NEXT_PUBLIC_INVITE_ONLY` to `false` and switch Supabase
  sign-ups back on. Only do this when you are ready to pay for whoever walks in.
- **Privacy text**: `/privacy` is written for a small invited pilot. Add your
  company name and a contact address before you open it to strangers.
- **The code folder is inside OneDrive.** That is fine for GitHub, but builds on
  your own computer sometimes fail on a locked file. Moving `web/` out of
  OneDrive one day would remove that.

## What it costs

- Vercel: free plan is enough for a pilot.
- Supabase: free plan is enough; keep an eye on the database size.
- Anthropic: the only real cost. Each person is limited to 80 AI messages and
  20 drafts per day. The **Admin** page shows an estimate per person; your
  Anthropic Console shows the exact bill.
