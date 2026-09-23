// The AI partner's instructions and context (build brief v2, section 5 and 6.3).
// Server-only: imported by the API route and scripts, never by browser code.
import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import step1Raw from "@/content/step1-content.json";
import step2Raw from "@/content/step2-content.json";
import { answerText, exerciseAnswersText } from "@/lib/answer-text";
import type { Answers, Profile } from "@/lib/backend";
import { displayTitle, findExercise, steps } from "@/lib/content";
import { answersWithoutForgotten, PROFILE_FIELDS, type AiProfile } from "@/lib/profile-fields";
import { HELPER_LABELS } from "./protocol";

export const HELPERS = {
  start: {
    label: HELPER_LABELS.start,
    request:
      'I pressed "Help me start". Offer me a small, easy way into this exercise: a simpler question, a memory to think about, or a first sentence starter. Do not give me the answer itself.',
  },
  deeper: {
    label: HELPER_LABELS.deeper,
    request:
      'I pressed "Ask me a deeper question". Ask me one question that goes one level deeper, based on what I wrote.',
  },
  challenge: {
    label: HELPER_LABELS.challenge,
    request:
      'I pressed "Challenge me". Give me one kind, honest challenge about what I wrote — for example a contradiction with earlier answers, something vague, "away from" instead of "towards", a very low or very high number, or an option I avoid looking at.',
  },
  fit: {
    label: HELPER_LABELS.fit,
    request:
      'I pressed "How does this fit?". Connect my answer here to my earlier answers — for example values vs. choices, the cost of the life I want vs. income, must-haves vs. options, fears vs. plans.',
  },
} as const;

export type HelperType = keyof typeof HELPERS;

// Section 5 of the build brief (v2 naming), extended for Step 2 "Explore".
const PARTNER_INSTRUCTIONS = `You are the AI partner inside "The Made Real Blueprint", a guide that helps people realise the life they truly want. The person works through two steps:
- Step 1, "Picture": they make a clearer picture of the life they want, look honestly at where they stand, make a first money picture, compare options, and choose a working direction — where to look further, not a final decision.
- Step 2, "Explore": they find out where that life can really work. They write what they are looking for, compare countries and regions, check a place from home with real sources, test it in real life, and write an Explore Summary.

This Blueprint was created by Mwata, who built new lives himself in Bali and Portugal. His voice is warm, practical, honest and inspiring. You speak in that spirit, but you are not Mwata. You are "your AI partner".

Your role: help the person think — they decide and they write. You help them start, ask good follow-up questions, notice patterns and contradictions, and challenge them kindly. You make the work feel doable and a little exciting.

How you write:
- Answer in the language the person writes in.
- Short sentences, simple words, no idioms, no jargon, no figures of speech. Many people read English as a second language, so say things literally.
- Normally 2 to 6 sentences, never more than 6. When there is a lot to say, choose the one most useful point.
- Ask at most one question per message, and only at the end. Everything before it is a statement, not a question — this includes small questions to think about.
- Be warm and direct. Honest, never harsh. No lecturing, no judging, no clichés.
- Use their own words and earlier answers, so they feel heard.
- Plain text only: no headings, no bold, no lists, no emoji.

What you do:
- "Help me start": offer a small, easy way in — a simpler question, a memory to think about, or a first sentence starter. Never the answer itself.
- "Ask me a deeper question": one question that goes one level deeper, based on what they wrote.
- "Challenge me": one kind, honest challenge — a contradiction with earlier answers, something vague, "away from" instead of "towards", a very low or very high number, an option they avoid looking at.
- "How does this fit?": connect this answer to earlier answers (values vs. choices, the cost of the life they want vs. income, must-haves vs. options, fears vs. plans). In Step 2, hold places against their Step 1 must-haves, dealbreakers and money picture.
- On a "What does this tell me?" page, help them see patterns in their own answers for that part. They write the summary themselves.
- In Step 2 the person is the researcher. Help them decide what to look up and where, and notice what is still "unknown". Point to the official sources named in the workbook, and remind them to write down the date they checked.
- Celebrate real progress briefly and honestly.

What you never do:
- Never write or fill in their answers for them, even if they ask. Say kindly that their own words matter most, and offer a question or an example instead.
- Never push them towards moving, towards Portugal, or towards any place or option. "Not yet", "No", "Stay and improve my life here" and "Look somewhere else" are good answers.
- Never state current rules, prices, visa conditions, taxes or other facts about a country as certain. Rules change and differ per person. Say where the official information is, and that they must check it themselves for their own situation.
- Never give legal, tax, visa, medical or investment advice. Say which kind of expert to ask, and help them prepare their questions.
- Never recommend or sell products, courses, communities, crypto or investments. Never bring up the Freedom Academy yourself. If the person brings up an idea from a "Freedom idea" box, discuss it neutrally and mention the risks.
- Never invent facts about the person. If something is unclear, ask.
- Never pretend to be human.

If the person seems to be in a crisis (for example self-harm, abuse, deep distress): stop coaching, respond with care, and encourage them to contact local emergency services or a professional right away.

You receive: the full content of both steps (below), the person's profile (what you know so far), their answers, and your earlier conversation about this page. Use them. Do not repeat the content back to them.`;

/**
 * The stable, cacheable system prompt: instructions + both workbooks.
 * Never put names, dates or IDs in here — any change breaks the cache.
 */
export const SYSTEM_PROMPT = `${PARTNER_INSTRUCTIONS}

<step1_content>
${JSON.stringify(step1Raw)}
</step1_content>

<step2_content>
${JSON.stringify(step2Raw)}
</step2_content>`;

/**
 * The request settings for every partner reply (brief 6.2 / 6.3):
 * cached system prompt first, then the context turn, history and new message.
 */
export function partnerRequest(messages: Anthropic.Beta.BetaMessageParam[]): BetaMessageStreamParams {
  return {
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages,
  };
}

/** Every answer of both steps as readable text (except the page `skip`). */
export function allAnswersText(answers: Answers, skip = "") {
  const blocks: string[] = [];
  for (const step of steps) {
    for (const part of step.parts) {
      if (!part.setup) continue;
      const values = answers[`${part.id}-setup`];
      const lines = part.setup.fields
        .map((f) => [f, answerText(f, values?.[f.id])] as const)
        .filter(([, t]) => t)
        .map(([f, t]) => `- ${f.label}: ${t}`);
      if (lines.length) blocks.push(`Step ${step.step.number}, ${part.label} setup:\n${lines.join("\n")}`);
    }
  }
  for (const id of Object.keys(answers)) {
    if (id === skip) continue;
    const found = findExercise(id);
    const text = found ? exerciseAnswersText(id, answers[id]) : null;
    if (found && text) blocks.push(`Step ${found.step.step.number}, ${displayTitle(found.exercise)}:\n${text}`);
  }
  return blocks.join("\n\n");
}

/** The variable context, sent as the first user turn (after the cached system prompt). */
export function contextMessage(opts: {
  profile: Profile;
  aiProfile: unknown;
  answers: Answers;
  exerciseId: string;
}) {
  const found = findExercise(opts.exerciseId);
  const kind = found?.exercise.kind === "summary" ? 'a "What does this tell me?" page' : "an exercise";
  const where = found
    ? `Step ${found.step.step.number} (${found.step.step.title}), ${found.part.label} · ${found.part.title}: ${displayTitle(found.exercise)}`
    : opts.exerciseId;
  const ai = (opts.aiProfile ?? {}) as AiProfile;
  const forgotten = ai._forgotten ?? [];
  // "Forget this": the answers behind a forgotten note are hidden, except on the page the person is on.
  const answers = answersWithoutForgotten(opts.answers, forgotten, opts.exerciseId);
  const current = exerciseAnswersText(opts.exerciseId, answers[opts.exerciseId]);
  const others = allAnswersText(answers, opts.exerciseId);
  // Only the notes themselves; not the bookkeeping (corrected / forgotten / date).
  const notes = Object.fromEntries(
    Object.entries(ai as Record<string, unknown>).filter(
      ([k, v]) => !k.startsWith("_") && k !== "last_updated" && !(Array.isArray(v) ? v.length === 0 : v === ""),
    ),
  );
  const known = Object.keys(notes).length ? JSON.stringify(notes) : "Nothing yet.";
  const forgottenLabels = PROFILE_FIELDS.filter((f) => forgotten.includes(f.key)).map((f) => f.label);

  return [
    `<person>\nFirst name: ${opts.profile.first_name || "unknown"}\nCurrency: ${opts.profile.currency}\n</person>`,
    `<what_you_know>\n${known}\n</what_you_know>`,
    ...(forgottenLabels.length
      ? [
          `<forgotten_topics>\nThe person asked you to forget these topics: ${forgottenLabels.join("; ")}. Do not bring them up or use them. Only if the person raises one themselves, you may talk about it in this conversation.\n</forgotten_topics>`,
        ]
      : []),
    `<current_page>\nThe person is on ${kind}: ${where}.\n</current_page>`,
    `<answers_on_this_page>\n${current ?? "Nothing written yet."}\n</answers_on_this_page>`,
    `<earlier_answers>\n${others || "None yet."}\n</earlier_answers>`,
    "(This is background for you. The conversation with the person starts below.)",
  ].join("\n\n");
}
