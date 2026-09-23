// Manual check of "Help me draft this" with the real model and made-up answers.
// Costs about one cent. Run: npm run draft-check
import Anthropic from "@anthropic-ai/sdk";
import type { Answers } from "@/lib/backend";
import { anthropicClient } from "@/lib/partner/client";
import { draftPage } from "@/lib/partner/draft";

// Made-up Part 1 answers. 1.4 values are "forgotten", and 2.1 (Part 2) must not be used.
const answers: Answers = {
  "1.1": { moments: ["Repairing my grandfather's boat", "A slow lunch with friends in Porto", "Planting tomatoes"], common: "Working with my hands, no rush, people I love." },
  "1.2": { day: "I wake up at 7 near the sea. I work four hours on my online shop. In the afternoon I garden. Friends come for dinner twice a week.", needs: "Calm, nature, contact with people." },
  "1.4": {
    values: ["Freedom", "Faith", "Nature", "Family", "Simplicity"],
    must_haves: { r0: { must_have: "Walking distance to the sea", importance: "Essential" }, r1: { must_have: "A garden", importance: "Strongly preferred" } },
    dealbreakers: "More than 2 hours from my son",
  },
  "2.1": { wheel: { r1: { today: "3", one_year: "8", better: "PART-TWO-MARKER" } } },
};

async function main() {
  const result = await draftPage(anthropicClient(), "life_picture", answers, { _forgotten: ["values"] }, "en");
  if (!result) throw new Error("No draft returned.");
  const d = result.drafts;
  console.log(JSON.stringify(d, null, 2));
  const all = Object.values(d).join(" ");
  const words = all.split(/\s+/).filter(Boolean).length;
  const checks = [
    ["only boxes of this page", Object.keys(d).every((k) => ["needs_patterns", "more_of", "keep", "essentials", "tensions", "unknowns"].includes(k))],
    ["at most 150 words", words <= 150],
    ["uses their words (sea / garden / hands)", /sea|garden|hands/i.test(all)],
    ["no Part 2 answers used", !all.includes("PART-TWO-MARKER")],
    ["forgotten values not used (Faith)", !/faith/i.test(all)],
  ] as const;
  for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  console.log(`words=${words} tokens: in=${result.usage.input_tokens} out=${result.usage.output_tokens}`);
  if (checks.some(([, ok]) => !ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Anthropic.APIError ? `API error ${e.status}: ${e.message}` : e);
  process.exit(1);
});
