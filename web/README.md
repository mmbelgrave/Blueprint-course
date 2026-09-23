# The Made Real Blueprint — Portugal Edition (app)

Next.js 16 (App Router) + TypeScript + Tailwind, Supabase (auth + Postgres),
Claude API (`claude-opus-5`). Brief: `../build-prompt-v1.md` + `../PROJECT.md`.
Content: `../step1-content.json` (Step 1 Picture) and `../step2-content.json`
(Step 2 Explore), copied into `src/content/` on every dev/build — edit the
originals, never the copies.

## Run it on your computer

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without a `.env.local` file the app runs in
**preview mode**: no account, answers saved in this browser only, no AI partner.

To test screens without signing in while `.env.local` has real keys, run a
separate preview-mode copy on port 3001 (it builds into `.next-preview`):

```bash
node scripts/preview-mode.cjs
```

## Connect Supabase (real accounts)

1. Create a free project at supabase.com. Region: **EU (Frankfurt, eu-central-1)**.
2. SQL Editor -> New query -> paste `supabase/schema.sql` -> Run.
3. Authentication -> URL Configuration: Site URL `http://localhost:3000`,
   add redirect URL `http://localhost:3000/auth/callback`.
4. (Recommended, so the email link also works on another device)
   Authentication -> Email Templates -> Magic Link: replace the link with
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`
5. Copy `.env.example` to `.env.local` and fill in the values.
6. Restart `npm run dev`. The orange "Preview mode" bar disappears.

## Checks

```bash
npm test                          # unit tests (no costs)
npm run typecheck
npm run lint
npm run build
npm run partner-check             # live AI partner test, a few cents
npm run partner-check -- step2    # only the cases whose name contains "step2"
npm run profile-check             # live "what my partner knows" test, about one cent
```

## Structure

- `src/lib/content.ts` — typed access to both workbooks (`steps`, `findExercise`, …)
- `src/lib/backend/` — sign-in and data storage behind one interface
  (`supabase.ts` real, `local.ts` preview). Swap auth here for Whop later.
- `src/lib/app-state.tsx`, `src/lib/answer-saver.ts` — loading and autosave
- `src/components/fields.tsx`, `src/lib/field-extras.ts` — all answer field types
- `src/lib/money.ts` — unknown amounts, totals, the 3.5 calculation
- `src/app/step/[step]/…` — step overview and the exercise screen
- `src/app/api/partner` — the AI partner (streaming); `src/lib/partner/prompt.ts` its instructions
- `src/app/api/profile`, `src/lib/partner/profile-update.ts` — what the partner knows (memory)
- `src/app/me` — "What my partner knows about me"; `src/app/api/account/delete` — delete everything
- `supabase/schema.sql` — tables + row-level security
