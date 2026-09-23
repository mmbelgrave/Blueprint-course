// Manual check of the "what my partner knows" update with the real model and
// made-up answers: notes come only from the answers, a corrected item is kept,
// a forgotten item stays empty. Costs about one cent. Run: npm run profile-check
import Anthropic from "@anthropic-ai/sdk";
import type { Answers } from "@/lib/backend";
import { anthropicClient } from "@/lib/partner/client";
import { updateProfile } from "@/lib/partner/profile-update";
import type { AiProfile } from "@/lib/profile-fields";

const answers: Answers = {
  "1.1": { moments: ["Building a table with my father", "A market morning in Lisbon", "Teaching my niece to swim"], common: "Using my hands, being outside, helping someone." },
  "1.4": {
    values: ["Freedom", "Security", "Nature", "Family", "Creativity"],
    must_haves: { r0: { must_have: "Walking distance to the sea", importance: "Essential" }, r1: { must_have: "A workshop", importance: "Strongly preferred" } },
    dealbreakers: "More than 2 hours from my daughter",
  },
  "3.4": { income: { r0: { source: "Pension", new_life: "900", certainty: "Confirmed" }, r1: { source: "Online teaching", new_life: "600", certainty: "Hoped" } } },
  "4.4": { fears: { r0: { fear: "Being lonely in winter", likely: "Medium", impact: "Big", warning: "", action: "Join a club in the first month" } } },
  "s2-1.2": { countries: ["Portugal", "Spain"] },
};

// The person corrected "values" earlier, and asked to forget "fears".
const current: AiProfile = {
  values: ["Freedom", "Family"],
  fears: ["Being lonely in winter"],
  _locked: ["values"],
  _forgotten: ["fears"],
};

async function main() {
  const result = await updateProfile(anthropicClient(), current, answers);
  if (!result) throw new Error("No profile returned (stop reason was not end_turn).");
  const p = result.profile;
  console.log(JSON.stringify(p, null, 2));
  const checks = [
    ["corrected item kept exactly", JSON.stringify(p.values) === JSON.stringify(["Freedom", "Family"])],
    ["forgotten item empty", Array.isArray(p.fears) && p.fears.length === 0],
    ["must-haves taken from the answers", JSON.stringify(p.must_haves ?? "").toLowerCase().includes("sea")],
    ["places mention Portugal", String(p.places ?? "").includes("Portugal")],
  ] as const;
  for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  console.log(`tokens: in=${result.usage.input_tokens} out=${result.usage.output_tokens}`);
  if (checks.some(([, ok]) => !ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Anthropic.APIError ? `API error ${e.status}: ${e.message}` : e);
  process.exit(1);
});
