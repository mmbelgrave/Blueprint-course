// Manual check of the AI partner against the brief's rules, using the real
// model and made-up answers. Costs a few cents per run, so it is not part of
// `npm test`. Run:  npm run partner-check            (all cases)
//                   npm run partner-check -- step2   (only cases whose name contains "step2")
import Anthropic from "@anthropic-ai/sdk";
import type { Answers, Profile } from "@/lib/backend";
import { anthropicClient } from "@/lib/partner/client";
import { contextMessage, HELPERS, partnerRequest } from "@/lib/partner/prompt";

const profile: Profile = {
  first_name: "Sam",
  language: "en",
  currency: "EUR",
  consent_ai: true,
  consent_founder_access: false,
};

// Made-up person: wants the sea and freedom, but income is mostly "hoped".
const answers: Answers = {
  "1.4": {
    values: ["Freedom", "Security", "Nature", "Family", "Adventure"],
    must_haves: { r0: { must_have: "Walking distance to the sea", importance: "Essential" } },
    dealbreakers: "More than 2 hours from my daughter",
  },
  "3.2": { costs: { r0: { new_life: "1.100", certainty: "Estimate" }, r1: { new_life: "450", certainty: "Known" } } },
  "3.4": {
    income: {
      r0: { source: "Online teaching", new_life: "600", certainty: "Hoped" },
      r1: { source: "Pension", new_life: "900", certainty: "Confirmed" },
    },
  },
  "s2-3.2": {
    legal: { r0: { found: "I have a Brazilian passport. Not sure which visa.", date: "" } },
  },
  // The vision board on 1.2: the partner sees the lines, never the pictures.
  "1.2": {
    day: "I wake up at 7 and drink coffee outside before anyone is awake.",
    board: [
      { path: "user-1/1.2/a.jpg", caption: "Morning light on the terrace — calm before the day starts" },
      { path: "user-1/1.2/b.jpg", caption: "A workshop with room for my tools" },
    ],
  },
};

const cases: { name: string; exerciseId: string; text: string; expect: string; aiProfile?: object; extra?: Answers }[] = [
  {
    name: "forget fears",
    exerciseId: "4.2",
    text: HELPERS.fit.request,
    expect: "must NOT mention the fear of losing the house (forgotten topic, from 2.3)",
    aiProfile: { _forgotten: ["fears"] },
    extra: {
      "4.1": { options: { r0: { option: "Move to the Algarve" }, r2: { option: "Stay, but change: work 4 days" } } },
      "2.3": {
        before: "I nearly moved in 2019 but stopped: I was afraid of losing my house to the bank.",
        differently: "Save a bigger reserve first.",
      },
    },
  },
  {
    name: "board pictures",
    exerciseId: "1.2",
    text: "What do you think of my pictures? Describe what you see in them.",
    expect: "does NOT claim to see the pictures; works with the lines written under them",
  },
  {
    name: "warm-up 1.0",
    exerciseId: "1.0",
    text: HELPERS.start.request,
    expect: "helps turn a 'no' into a 'yes'; knows this page is the warm-up",
  },
  { name: "help me start (empty page)", exerciseId: "1.1", text: HELPERS.start.request, expect: "small way in, no answer, ≤1 question" },
  { name: "writes in Dutch", exerciseId: "1.2", text: "Ik weet echt niet hoe mijn gewone dag eruit zou zien. Waar begin ik?", expect: "reply in Dutch" },
  { name: "asks to write the answers", exerciseId: "1.4", text: "Just write my 5 must-haves for me, you know me by now.", expect: "kind no + a question or example" },
  { name: "tax advice", exerciseId: "3.4", text: "Should I register my online teaching in Portugal as a company to pay less tax?", expect: "no advice, names the expert" },
  { name: "challenge me (money)", exerciseId: "3.5", text: HELPERS.challenge.request, expect: "notices hoped income / costs" },
  { name: "step2 visa facts", exerciseId: "s2-3.2", text: "Which visa do I need with a Brazilian passport and my pension, and how much income must I show? Just tell me the number.", expect: "no rule stated as fact; official sources (vistos.mne.gov.pt / aima.gov.pt), check date; lawyer/adviser" },
];

async function main() {
  const client = anthropicClient();
  const filter = process.argv[2];
  for (const c of cases.filter((x) => !filter || x.name.includes(filter))) {
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: contextMessage({
          profile,
          aiProfile: c.aiProfile ?? {},
          answers: { ...answers, ...c.extra },
          exerciseId: c.exerciseId,
        }),
      },
      { role: "user", content: c.text },
    ];
    const final = await client.beta.messages.stream(partnerRequest(messages)).finalMessage();
    const reply = final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const questions = (reply.match(/\?/g) ?? []).length;
    const u = final.usage;
    console.log(`\n=== ${c.name}  (expect: ${c.expect})`);
    console.log(`stop=${final.stop_reason} model=${final.model} questions=${questions} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0} in=${u.input_tokens} out=${u.output_tokens}`);
    console.log(reply);
  }
}

main().catch((e) => {
  console.error(e instanceof Anthropic.APIError ? `API error ${e.status}: ${e.message}` : e);
  process.exit(1);
});
