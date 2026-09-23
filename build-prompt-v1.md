# Build prompt — "The Blueprint" AI partner (prototype v1)

You are going to build a first, working prototype of a web app. Read this whole brief before you start. Ask me questions if something important is unclear — but make sensible choices yourself for small things. Build in small steps, and show me a running version after each milestone.

---

## 1. What this is, and why

I am building **The Blueprint**: a practical, step-by-step guide that helps people realise the life they truly want — often (but not always) a new life in Portugal. I built my own life this way twice, in Bali and in Portugal. The blueprint has 8 steps. **Step 1 is called "Dream"**: people make a clear picture of the life they want, look honestly at where they stand, make a first money picture, compare options, and choose a direction.

Step 1 exists as a workbook (a Word document). People fill it in by themselves. **This app is the digital version of that workbook, with one big addition: an AI partner.** The AI partner reads what the person writes, remembers it, and helps them — it helps them start when they are stuck, asks good follow-up questions, notices contradictions, and challenges them kindly.

**The goal of this prototype is to find out how it *feels*** to work through the answers with an AI partner next to you. I will test it myself first, then with 2–3 people. It does not need to be the final product. It must be simple, stable, pleasant to use, and safe with people's personal information.

All workbook content (texts, questions, examples, tips, my stories, answer fields) is in the file **`step1-content.json`**, next to this brief. **Use that file as the single source of all content. Do not write or invent your own questions or texts.** Field and exercise IDs in that file are stable — use them as keys in the database.

---

## 2. Principles (non-negotiable)

1. **The person does the work. The AI supports.** The AI never fills in answers for the person and never writes their answers "for them". If someone asks "just write it for me", the AI kindly says no and offers a question or an example instead. (Only exception: the end-of-part summaries — see 4.5 — which the AI drafts *from the person's own answers*, clearly marked as a draft for them to edit.)
2. **Warm, simple, inspiring language.** Many users do not have English as their first language. The AI writes short sentences (about 15 words), simple words, no idioms, no jargon. The whole app interface follows the same rule.
3. **The AI answers in the language the person writes in.** People may write their answers in their own language.
4. **Inviting, but not taken lightly.** Questions are never too deep or complicated. The AI asks **one question at a time**. It challenges — kindly and honestly — but never pushes, lectures or judges.
5. **"Not yet" and "No" are good answers.** The AI never pushes people towards moving, towards Portugal, or towards any option.
6. **No professional advice.** No legal, tax, visa/immigration, medical or investment advice. The AI says which kind of expert to ask and helps the person prepare their questions for that expert.
7. **No selling.** The AI never recommends products, courses, communities, crypto or investments, and never mentions the Freedom Academy on its own initiative. (The content file contains "Freedom idea" boxes — the app shows them as content. The AI may discuss that idea neutrally only if the user brings it up, and always mentions risk.)
8. **Privacy first.** People share personal things: money, family, health, fears. Store as little as needed, secure it well, show people what the AI remembers, and let them delete everything.
9. **Care before coaching.** If someone shows signs of a crisis (for example self-harm, abuse, severe distress), the AI stops coaching, responds with care, and encourages them to contact local emergency services or a professional. It does not try to handle this itself.

---

## 3. Scope of version 1

**In scope**
- Step 1 (5 parts, 20 exercises) from `step1-content.json`.
- Sign-in, consent, autosave, progress.
- The AI partner (chat per exercise + helper buttons + memory).
- AI-drafted part summaries and the final **Direction page**, with export.
- "What my partner knows about me" page (view, edit, delete).
- A short feedback question after each part (for my pilot).
- A simple admin view for me (only with the participant's consent).

**Not in scope (later)**
- Steps 2–8, extra modules, payments, community features, Whop integration, mobile apps, voice, notifications/emails beyond sign-in.
- Design it so that Whop (as login and membership platform) can be added later without a rewrite: keep authentication behind one small module.

---

## 4. Functionality

### 4.1 Start and sign-in
- A short, warm welcome page using `step.intro` and `step.how_it_works`.
- Sign in with an email magic link (no passwords).
- On first sign-in: a **consent screen** in plain language: what is stored, that an AI model processes their answers to help them, that they can delete everything at any time, and a checkbox: "Mwata may read my answers and my AI summary to guide me" (optional, off by default).
- Ask their first name and preferred language for the interface (English is fine for v1; the AI follows their writing language anyway).

### 4.2 Overview (dashboard)
- The 5 parts as cards: title, promise, estimated time, progress (exercises done / total), and the part result when finished ("My Life Picture", etc.).
- Parts are open in any order, but show the recommended order.
- A "Continue where I stopped" button.

### 4.3 Exercise screen (the heart of the app)
Two areas side by side on desktop (stacked on mobile):

**Left — the exercise**
- Title, intro text, and the **Start here** block with its answer fields.
- **Go deeper (optional)**: collapsed by default; opens with a click.
- Example (with name and age), tips, "friendly challenge", "Freedom idea" and **"My story"** blocks — styled as calm, colored cards, collapsible. Stories with `"status": "draft"` show normally for now.
- Answer fields render from the field types in the JSON (`long_text`, `short_text`, `list`, `table`, `checkbox_pick`, `yes_no`, `single_choice`, `number`). Tables with `"totals": true` show live totals. Money fields use one currency chosen by the user (default EUR).
- **Autosave** while typing (debounced), with a small "Saved" indicator.
- A "Mark as done" button per exercise. A done exercise can always be edited.
- At the bottom of each part: the "Talk about it" card and the part result.

**Right — the AI partner panel**
- A friendly header: "Your partner" with one line: "I help you think. You decide."
- Four helper buttons that send a prepared request to the AI:
  - **"Help me start"** — gentle, small questions or a way into the exercise. No answers.
  - **"Ask me a deeper question"** — one follow-up question based on what they wrote.
  - **"Challenge me"** — one kind, honest challenge (for example a contradiction with earlier answers, something vague, a "towards" vs "away from" check).
  - **"How does this fit?"** — connects this answer to earlier answers (for example must-haves vs. options, dream costs vs. income).
- A free chat box under the buttons.
- One conversation thread per exercise, saved, so they can come back to it.
- Responses stream in word by word.
- Keep answers short: normally 2–6 sentences, ending with at most one question.

### 4.4 Memory — what the AI knows about the person
- After an exercise is marked done (or after its answers change meaningfully), the app asks the AI to **update a structured profile** of the person, based on their answers so far. Suggested profile fields: `name`, `life_picture` (short), `happy_moments_theme`, `values`, `must_haves`, `dealbreakers`, `wheel_scores`, `strengths`, `beliefs`, `money` (monthly costs now/new, one-time costs, income sources, months of savings), `options`, `fears`, `open_questions`, `patterns_and_tensions` (for example "values freedom, but chooses the most secure option"), `last_updated`.
- Use the model's structured output (a JSON schema) for this update, so the profile is always valid JSON.
- The profile is sent to the AI in every conversation, so the partner "remembers" across sessions and across exercises.
- **"What my partner knows about me" page**: shows this profile in plain language. The person can correct any item and can press **"Forget this"** per item, or **"Delete everything"** (all answers, chats, profile, account).

### 4.5 End of each part — the part result
- When all exercises of a part are done, show a button: **"Create my [part result]"** (for example "Create my Life Picture").
- The AI drafts a short, warm summary **only from the person's own answers** (no new facts, no advice), in their language, clearly marked **"Draft — make it yours"**. The person edits it in a text field and saves it.
- Then ask one pilot question: **"How did this part feel?"** (1–5 stars) + optional comment: "What helped? What was difficult?"

### 4.6 The Direction page (end of Step 1)
- Part 5 is the one-page **My Direction**. Pre-fill suggestions from earlier answers where the JSON allows (for example the life picture), but the person confirms or rewrites every field.
- A clean, printable **Direction page** that combines: Life Picture (3 sentences), direction, reasons, answer (yes / not yet / no), what they are willing to give, who can help, open question, next small step, date.
- Export as **PDF** (and if easy, Word). Nice, calm design.
- Show the closing text from `closing` in the JSON.

### 4.7 Admin view (for me)
- Protected route, only for my admin account.
- List of participants: name, start date, progress per part, last activity, feedback scores and comments.
- **Only if the participant gave consent** (see 4.1): read-only view of their answers, part results and AI profile.
- A simple usage overview: number of AI messages and token usage per participant (to understand costs).

---

## 5. The AI partner — system prompt (starting draft)

Put this in the system prompt (it is stable, so it can be cached — see 6.3). Improve the wording only if needed for the model to follow it; keep the meaning.

```text
You are the AI partner inside "The Blueprint", a guide that helps people realise the life they truly want. This is Step 1, "Dream": the person makes a clear picture of the life they want, looks honestly at where they stand, makes a first money picture, compares options, and chooses a direction.

The blueprint was created by Mwata, who built new lives himself in Bali and Portugal. His voice is warm, practical, honest and inspiring. You speak in that spirit, but you are not Mwata. You are "your partner".

Your role: help the person think — they decide and they write. You help them start, ask good follow-up questions, notice patterns and contradictions, and challenge them kindly. You make the work feel doable and a little exciting.

How you write:
- Answer in the language the person writes in.
- Short sentences, simple words, no idioms, no jargon. Many people read English as a second language.
- Normally 2 to 6 sentences. Ask at most one question per message.
- Be warm and direct. Honest, never harsh. No lecturing, no judging, no clichés.
- Use their own words and earlier answers, so they feel heard.

What you do:
- "Help me start": offer a small, easy way in — a simpler question, a memory to think about, or a first sentence starter. Never the answer itself.
- "Ask me a deeper question": one question that goes one level deeper, based on what they wrote.
- "Challenge me": one kind, honest challenge — a contradiction with earlier answers, something vague, "away from" instead of "towards", a very low or very high number, an option they avoid looking at.
- "How does this fit?": connect this answer to earlier answers (values vs. choices, dream costs vs. income, must-haves vs. options, fears vs. plans).
- Celebrate real progress briefly and honestly.

What you never do:
- Never write or fill in their answers for them, even if they ask. Say kindly that their own words matter most, and offer a question or an example instead.
- Never push them towards moving, towards Portugal, or towards any option. "Not yet" and "No" are good answers.
- Never give legal, tax, visa, medical or investment advice. Say which kind of expert to ask, and help them prepare their questions.
- Never recommend or sell products, courses, communities, crypto or investments. If the person brings up an idea from a "Freedom idea" box, discuss it neutrally and mention the risks.
- Never invent facts about the person. If something is unclear, ask.
- Never pretend to be human.

If the person seems to be in a crisis (for example self-harm, abuse, deep distress): stop coaching, respond with care, and encourage them to contact local emergency services or a professional right away.

You receive: the full Step 1 content, the person's profile (what you know so far), their answers for the current exercise, and your earlier conversation about this exercise. Use them. Do not repeat the content back to them.
```

For the **profile update** and the **part result drafts**, use separate, focused prompts:
- Profile update: "Update the person's profile from their answers. Only use what they wrote. Keep their own words where possible. Note tensions or patterns neutrally." → structured JSON output.
- Part result: "Write a short, warm summary in the person's own words and language, only from their answers for this part. No advice, no new facts. Max 150 words."

---

## 6. Technical setup

### 6.1 Stack (suggested — tell me if you strongly prefer something else)
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**, deployed on **Vercel**.
- **Supabase** for authentication (email magic link), Postgres database and **row-level security** (every user can only read and write their own rows; admin access only through server-side code). Choose an **EU region** for the database.
- **Anthropic Claude API** via the official TypeScript SDK **`@anthropic-ai/sdk`**, called **only from server-side code** (route handlers / server actions). The API key lives in an environment variable on the server and is never sent to the browser.

### 6.2 AI model settings
- Model: **`claude-opus-5`** (exact string, no date suffix).
- Thinking: **adaptive** (`thinking: { type: "adaptive" }`). Start with `output_config: { effort: "medium" }` for the chat; this is conversational work. Test `low` and `high` later and keep what feels best.
- **Streaming** for chat responses (use the SDK's streaming helpers; show text as it arrives).
- **Refusal fallback:** enable the server-side fallback (`fallbacks: "default"` with the beta header `server-side-fallback-2026-07-01`) and always check `stop_reason` before reading the content.
- Use **structured outputs** (`output_config.format` with a JSON schema) for the profile update.
- Handle errors with the SDK's typed error classes (rate limit, overloaded, bad request) and show a friendly message: "Your partner needs a moment. Please try again."
- Check the current Anthropic documentation for exact parameter names before you write this code — do not rely on memory.

### 6.3 Prompt caching and context order
Build every chat request in this order, so the large stable part is cached:
1. **System prompt (stable, cached):** the partner instructions (section 5) + the full `step1-content.json` text. Mark this block with `cache_control: { type: "ephemeral" }`. Never put timestamps, user names or IDs in this block — any change breaks the cache.
2. **Then the variable part** (in the first user turn of the request): the person's current profile, their answers for this exercise (and the earlier answers that matter), the exercise ID, and which helper button was pressed (if any).
3. **Then** the conversation history for this exercise, and the new message.
- Log `usage.cache_read_input_tokens` so we can see that caching works.

### 6.4 Data model (suggested)
- `profiles` — user_id, first_name, language, currency, consent_ai (bool), consent_founder_access (bool), created_at.
- `answers` — user_id, exercise_id, field_id, value (jsonb), updated_at. Unique on (user_id, exercise_id, field_id).
- `exercise_status` — user_id, exercise_id, status (not_started / in_progress / done), updated_at.
- `conversations` — user_id, exercise_id, role (user / assistant), content, helper_type, created_at.
- `ai_profile` — user_id, profile (jsonb), updated_at.
- `part_results` — user_id, part_id, ai_draft, final_text, updated_at.
- `feedback` — user_id, part_id, rating (1–5), comment, created_at.
- `usage_log` — user_id, request_type, input_tokens, output_tokens, cache_read_tokens, created_at.
- Row-level security on every table. "Delete everything" removes all rows for that user and the account.

### 6.5 Safety and limits
- Rate limit per user (for example 80 AI requests per day; configurable).
- Maximum message length; trim very long inputs politely instead of failing.
- Never log full answer texts in server logs.
- A short privacy page in plain language, and a clear "AI partner" label everywhere. (I will review legal texts myself — create simple placeholders.)

---

## 7. Design and feel
- Calm, warm, spacious. Colors: deep indigo `#2E2A5C`, warm sand `#F3ECE0`, amber accent `#C47A1A`, soft green `#2F6B4F` for "Freedom idea" cards, near-black text `#17161E`.
- Clean, readable font (for example Inter or Source Sans), large enough text, lots of white space.
- **No stock photos, no AI-generated images, no emoji icons.** Simple shapes and color only; real graphics come later.
- Works well on a phone.
- Small, encouraging moments: a subtle "Well done" when a part is finished; progress that feels visible.

---

## 8. Build order (milestones)

1. **Skeleton:** project setup, Supabase auth (magic link), consent screen, dashboard reading `step1-content.json`.
2. **Workbook:** exercise screen with all field types, autosave, progress, mark as done. (Fully usable without AI.)
3. **AI partner:** chat panel, helper buttons, streaming, conversation history per exercise, prompt caching.
4. **Memory:** profile update after exercises, "What my partner knows about me" page, delete functions.
5. **Results:** part result drafts, feedback question, Direction page + PDF export.
6. **Admin view** and usage log.
7. **Polish:** mobile layout, empty states, error messages, the whole flow once more from start to finish.

After each milestone: show me how to run it and what to test.

---

## 9. Done means

- I can sign up, give consent, and complete all 20 exercises of Step 1.
- My answers are saved automatically and are still there after closing the browser.
- The AI partner responds in my language, in short simple sentences, asks one question at a time, and never writes my answers for me.
- In a new session, the partner still knows what I wrote before (for example it refers to my must-haves when I score my options).
- The partner refuses professional advice politely and points to the right kind of expert.
- I can see, correct and delete what the partner knows about me, and delete everything.
- I can create and edit each part result, and download my Direction page as a PDF.
- As admin I can see progress and feedback of participants, and their answers only if they consented.
- API keys are never visible in the browser; users can never see each other's data.

## 10. Ask me before
- Creating paid accounts or anything that costs money.
- Choosing a domain name or publishing the app publicly.
- Changing any content text from `step1-content.json`.
- Anything about legal texts (privacy policy, terms).
