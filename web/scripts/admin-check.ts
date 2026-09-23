// Check of the admin overview against the real database (read-only, no AI costs).
// Run: npx tsx --env-file=.env.local scripts/admin-check.ts
import { buildOverview } from "@/lib/admin-overview";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function main() {
  const admin = supabaseAdmin();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  const participants = await buildOverview(admin);
  console.log(`participants: ${participants.length}`);
  for (const p of participants) {
    console.log(`\n${p.name || "(no name)"} — started ${p.started?.slice(0, 10)}, last active ${p.lastActivity?.slice(0, 10) ?? "—"}, may read answers: ${p.consentFounder}`);
    for (const s of p.progress) {
      console.log(`  Step ${s.step}: ${s.parts.map((x) => `${x.label} ${x.done}/${x.total}`).join(" · ")}`);
    }
    console.log(`  feedback: ${p.feedback.map((f) => `${f.part} ${f.rating}★`).join(", ") || "none"}`);
    const u = p.usage;
    console.log(`  AI: ${u.chatMessages} messages, ${u.drafts} drafts, ${u.noteUpdates} note updates; tokens in ${u.inputTokens}, out ${u.outputTokens}, cache ${u.cacheReadTokens}; ≈ $${u.costUsd.toFixed(3)}`);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
