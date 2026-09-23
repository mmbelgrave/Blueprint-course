// Admin tool: empties the answers (and status) of some pages for one account,
// then rebuilds that person's partner notes from what is left.
// Run: npx tsx --env-file=.env.local scripts/clear-pages.ts <email> <page> [page…]
// Example: npx tsx --env-file=.env.local scripts/clear-pages.ts me@example.com 3.2 3.3
import type { Answers } from "@/lib/backend";
import { anthropicClient } from "@/lib/partner/client";
import { updateProfile } from "@/lib/partner/profile-update";
import type { AiProfile } from "@/lib/profile-fields";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function main() {
  const [email, ...pages] = process.argv.slice(2);
  if (!email || !pages.length) throw new Error("Usage: clear-pages.ts <email> <page> [page…]");
  const admin = supabaseAdmin();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");

  const { data: list, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`No account for ${email}.`);

  for (const table of ["answers", "exercise_status"]) {
    const { count, error: e } = await admin
      .from(table)
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .in("exercise_id", pages);
    if (e) throw e;
    console.log(`${table}: ${count ?? 0} rows deleted for pages ${pages.join(", ")}`);
  }

  const [answerRows, current, profile] = await Promise.all([
    admin.from("answers").select("exercise_id, field_id, value").eq("user_id", user.id),
    admin.from("ai_profile").select("profile").eq("user_id", user.id).maybeSingle(),
    admin.from("profiles").select("language").eq("user_id", user.id).maybeSingle(),
  ]);
  const answers: Answers = {};
  for (const a of answerRows.data ?? []) (answers[a.exercise_id] ??= {})[a.field_id] = a.value;

  // Rebuild the notes from the remaining answers; corrections and "forget" stay respected.
  const old = (current.data?.profile ?? {}) as AiProfile;
  const fresh: AiProfile = { _locked: old._locked, _forgotten: old._forgotten };
  for (const k of old._locked ?? []) fresh[k] = old[k];
  const result = await updateProfile(anthropicClient(), fresh, answers, profile.data?.language ?? "en");
  if (!result) throw new Error("The notes could not be rebuilt (model did not finish).");
  const { error: saveError } = await admin
    .from("ai_profile")
    .upsert({ user_id: user.id, profile: result.profile, updated_at: new Date().toISOString() });
  if (saveError) throw saveError;
  const filled = Object.entries(result.profile).filter(
    ([k, v]) => !k.startsWith("_") && k !== "last_updated" && (Array.isArray(v) ? v.length : v),
  );
  console.log(`notes rebuilt: ${filled.map(([k]) => k).join(", ") || "(none)"}`);
  console.log(`money note: ${JSON.stringify(result.profile.money ?? "")}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
