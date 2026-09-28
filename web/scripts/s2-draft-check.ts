// Manual check of "Help me draft this" on the Explore Summary (Step 2, workbook
// v8 field names), with the real model and made-up answers. Costs about one cent.
// Run: npx tsx --env-file=.env.local scripts/s2-draft-check.ts
import Anthropic from "@anthropic-ai/sdk";
import type { Answers } from "@/lib/backend";
import { anthropicClient } from "@/lib/partner/client";
import { draftPage } from "@/lib/partner/draft";

const answers: Answers = {
  "1.4": {
    must_haves: { r0: { must_have: "Ground to grow food", importance: "Essential" } },
    dealbreakers: "More than 3 hours from my sister",
  },
  "3.2": { costs: { r0: { new_life: "550", certainty: "Estimate" }, r1: { new_life: "200", certainty: "Known" } } },
  "s2-2.3": { regions: ["Guarda", "Viseu"] },
  "s2-3.1": {
    costs: { r0: { guess: "600", found: "550", source: "idealista.pt", date: "20 Sep 2026" } },
    income_there: "My two clients stay; that is confirmed.",
  },
  "s2-3.2": {
    legal: { r0: { found: "EU passport, so a registration certificate at the camara after three months", date: "20 Sep 2026" } },
  },
  "s2-3.3": {
    daily: { r0: { p1: "15 minutes to the local hospital", certainty: "Known" }, r4: { p1: "Fibre at the address", certainty: "Estimate" } },
  },
  "s2-4.3": {
    ordinary_week: "Yes, but the village felt empty after three days. The small town 20 minutes away felt better.",
  },
};

const ALLOWED = ["place", "where", "reasons", "not_give", "monthly_cost", "income", "legal", "healthcare", "unknowns", "who_i_need"];

async function main() {
  const result = await draftPage(anthropicClient(), "s2-5.1", answers, {}, "en");
  if (!result) throw new Error("No draft returned.");
  const d = result.drafts;
  console.log(JSON.stringify(d, null, 2));
  const all = Object.values(d).join(" ");
  const words = all.split(/\s+/).filter(Boolean).length;
  const checks = [
    ["only the boxes that may be drafted", Object.keys(d).every((k) => ALLOWED.includes(k))],
    ["the choice and the dates are left to the person", !("choice" in d) && !("next_step" in d) && !("date" in d)],
    ["uses what they actually found", /550|guarda|viseu|hospital|registration/i.test(all)],
    ["no rule stated as certain", !/you must|the law says|you are required/i.test(all)],
    ["inside the word budget (20 per box)", words <= ALLOWED.length * 20],
    ["no escape codes in the text", !/\\u[0-9a-f]{4}/i.test(all)],
  ] as const;
  for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  console.log(`words=${words} tokens: in=${result.usage.input_tokens} out=${result.usage.output_tokens}`);
  if (checks.some(([, ok]) => !ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Anthropic.APIError ? `API error ${e.status}: ${e.message}` : e);
  process.exit(1);
});
