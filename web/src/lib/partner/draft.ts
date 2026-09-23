// Drafts a part result / summary page from the person's own answers (brief 4.5).
// Structured output: one short text per box. Server-only.
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Answers } from "@/lib/backend";
import { displayTitle, findExercise } from "@/lib/content";
import { draftFields, draftSourcePages } from "@/lib/drafts";
import { answersWithoutForgotten, type AiProfile } from "@/lib/profile-fields";
import { allAnswersText } from "./prompt";

// Brief 5: "Part result: Write a short, warm summary in the person's own words and
// language, only from their answers for this part. No advice, no new facts. Max 150 words."
const INSTRUCTIONS = `Write a short, warm summary in the person's own words and language, only from their answers for this part. No advice, no new facts. Max 150 words.

How:
- You fill in the boxes of one page. For each box, write one to three short sentences that answer that box, using only what the person wrote.
- If the answers say nothing for a box, return an empty string for it. Never guess or invent.
- Use their own words where you can. Write in the language they wrote their answers in; if that is unclear, use the FALLBACK LANGUAGE.
- Simple words and short sentences. No judging, no advice, no recommendations, no questions.
- All boxes together: at most 150 words. A box asking for "three sentences" gets three sentences.`;

const LANGUAGES: Record<string, string> = { en: "English", nl: "Dutch", pt: "Portuguese", de: "German", fr: "French", es: "Spanish" };

export type Drafts = Record<string, string>;

export async function draftPage(
  client: Anthropic,
  exerciseId: string,
  answers: Answers,
  aiProfile: AiProfile,
  language = "en",
): Promise<{ drafts: Drafts; usage: Anthropic.Beta.BetaUsage } | null> {
  const found = findExercise(exerciseId);
  if (!found) return null;
  const fields = draftFields(found.exercise);
  if (!fields.length) return null;

  // Only this page's source answers, and never the ones behind a forgotten note.
  const allowed = new Set(draftSourcePages(exerciseId));
  const visible = answersWithoutForgotten(answers, aiProfile._forgotten);
  const source = Object.fromEntries(Object.entries(visible).filter(([page]) => allowed.has(page)));

  const schema = z.object(Object.fromEntries(fields.map((f) => [f.id, z.string()])));
  const boxes = fields.map((f) => `- ${f.id}: ${f.label ?? f.hint ?? f.id}`).join("\n");

  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          `<page>Step ${found.step.step.number}, ${found.part.label} · ${found.part.title}: ${displayTitle(found.exercise)}</page>`,
          `<boxes>\n${boxes}\n</boxes>`,
          `<fallback_language>${LANGUAGES[language] ?? "English"}</fallback_language>`,
          `<answers>\n${allAnswersText(source) || "No answers yet."}\n</answers>`,
        ].join("\n\n"),
      },
    ],
  });

  // Check why the model stopped before reading the result.
  if (response.stop_reason !== "end_turn" || !response.parsed_output) return null;
  const drafts: Drafts = {};
  for (const f of fields) {
    const text = String((response.parsed_output as Record<string, unknown>)[f.id] ?? "").trim();
    if (text) drafts[f.id] = text;
  }
  return { drafts, usage: response.usage };
}
