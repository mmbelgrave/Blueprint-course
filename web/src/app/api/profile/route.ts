// Updates what the AI partner knows about the signed-in person, from their
// answers. Called by the browser after a page is marked as done.
import Anthropic from "@anthropic-ai/sdk";
import type { Answers } from "@/lib/backend";
import { anthropicClient } from "@/lib/partner/client";
import { updateProfile } from "@/lib/partner/profile-update";
import { applyPersonChoices, type AiProfile } from "@/lib/profile-fields";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fail(503, "The AI partner is not set up yet.");
  }
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("consent_ai, language")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profileRow?.consent_ai) return fail(403, "Your AI partner is switched off. You can switch it on in My settings.");

  const [answerRows, current] = await Promise.all([
    supabase.from("answers").select("exercise_id, field_id, value"),
    supabase.from("ai_profile").select("profile").eq("user_id", user.id).maybeSingle(),
  ]);
  const answers: Answers = {};
  for (const a of answerRows.data ?? []) (answers[a.exercise_id] ??= {})[a.field_id] = a.value;

  try {
    const result = await updateProfile(
      anthropicClient(),
      (current.data?.profile ?? {}) as AiProfile,
      answers,
      profileRow.language,
    );
    if (!result) return fail(502, "Your AI partner could not update its notes this time.");

    // The model took a few seconds: read the person's latest choices again, so a
    // "Forget this" or "Correct this" made in the meantime always wins (review R2-1).
    const { data: latestRow } = await supabase
      .from("ai_profile")
      .select("profile")
      .eq("user_id", user.id)
      .maybeSingle();
    const profile = applyPersonChoices(result.profile, (latestRow?.profile ?? {}) as AiProfile);

    const { error } = await supabase
      .from("ai_profile")
      .upsert({ user_id: user.id, profile, updated_at: new Date().toISOString() });
    if (error) return fail(500, "Your AI partner's notes could not be saved.");

    const u = result.usage;
    // Numbers only — never answer text.
    console.log(`profile: in=${u.input_tokens} out=${u.output_tokens}`);
    await supabaseAdmin()
      ?.from("usage_log")
      .insert({
        user_id: user.id,
        request_type: "profile",
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_read_tokens: u.cache_read_input_tokens ?? 0,
      });
    return Response.json({ profile });
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`profile: API error ${error.status}`);
    else console.error("profile: unexpected error", (error as Error).name);
    return fail(502, "Your AI partner needs a moment. Please try again.");
  }
}
