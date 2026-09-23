// Updates "what the partner knows" from the person's own answers (brief 4.4).
// Uses structured output, so the profile is always valid JSON. Server-only.
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Answers } from "@/lib/backend";
import { answersWithoutForgotten, PROFILE_FIELDS, type AiProfile, type ProfileKey } from "@/lib/profile-fields";
import { allAnswersText } from "./prompt";

const text = z.string();
const list = z.array(z.string());

/** Every item is required (empty string or empty list when nothing is known). */
export const ProfileSchema = z.object(
  Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, f.kind === "list" ? list : text])) as Record<
    ProfileKey,
    typeof text | typeof list
  >,
);

const INSTRUCTIONS = `Update the person's profile from their answers. Only use what they wrote. Keep their own words where possible. Note tensions or patterns neutrally.

Rules:
- Never invent anything. If an item is not in the answers, leave it empty ("" or []).
- Keep each item short: a few words per list item, one or two sentences for text items.
- Write the notes in the NOTES LANGUAGE given below. When you quote the person's own words, keep them exactly as they wrote them, in their language.
- Take each item from the pages it belongs to (Step 1 unless said otherwise): life_picture from 1.2, the Part 1 summary and 5.1; happy_moments_theme from 1.1 and 0.1; values only from the words chosen in 1.4; must_haves and dealbreakers from 1.4; wheel_scores from 2.1; strengths from 2.2; beliefs from 2.4; options from 4.1–4.3; fears from 4.4; open_questions from any "biggest question", "still don't know" or "unknown" answers. If that page is empty, leave the item empty.
- "money": costs now and in the new life, one-time costs, income sources and how sure they are, months of savings — only what they wrote.
- "places": countries, regions and places they are exploring in Step 2, what they found and what they chose.
- "patterns_and_tensions": for example "values freedom, but chooses the most secure option". Neutral, never judging.
- Items listed as LOCKED were corrected by the person: return them exactly as given.
- Items listed as FORGOTTEN must stay empty.`;

type Result = { profile: AiProfile; usage: Anthropic.Beta.BetaUsage };

/** Language names for the interface language stored in the person's profile. */
const LANGUAGES: Record<string, string> = { en: "English", nl: "Dutch", pt: "Portuguese", de: "German", fr: "French", es: "Spanish" };

export async function updateProfile(
  client: Anthropic,
  current: AiProfile,
  answers: Answers,
  language = "en",
): Promise<Result | null> {
  const locked = current._locked ?? [];
  const forgotten = current._forgotten ?? [];
  const known: Record<string, unknown> = {};
  for (const f of PROFILE_FIELDS) if (current[f.key] !== undefined) known[f.key] = current[f.key];

  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: betaZodOutputFormat(ProfileSchema) },
    system: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          `<notes_language>${LANGUAGES[language] ?? "English"}</notes_language>`,
          `<current_profile>\n${JSON.stringify(known)}\n</current_profile>`,
          `<locked>${locked.join(", ") || "none"}</locked>`,
          `<forgotten>${forgotten.join(", ") || "none"}</forgotten>`,
          // Answers behind forgotten notes are left out, so nothing else is built from them either.
          `<answers>\n${allAnswersText(answersWithoutForgotten(answers, forgotten)) || "No answers yet."}\n</answers>`,
        ].join("\n\n"),
      },
    ],
  });

  // Check why the model stopped before reading the result.
  if (response.stop_reason !== "end_turn" || !response.parsed_output) return null;

  const next: AiProfile = { ...response.parsed_output, _locked: locked, _forgotten: forgotten };
  // The person's corrections and "forget this" always win over the model.
  for (const key of locked) next[key] = current[key];
  for (const key of forgotten) next[key] = PROFILE_FIELDS.find((f) => f.key === key)!.kind === "list" ? [] : "";
  next.last_updated = new Date().toISOString();
  return { profile: next, usage: response.usage };
}
