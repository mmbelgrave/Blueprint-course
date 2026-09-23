// "Help me draft this": the AI partner drafts a summary page from the person's
// own answers. The draft is stored (part_results.ai_draft) and shown next to the
// boxes; the person decides what goes in.
import Anthropic from "@anthropic-ai/sdk";
import type { Answers } from "@/lib/backend";
import { findExercise } from "@/lib/content";
import { draftFields } from "@/lib/drafts";
import { anthropicClient } from "@/lib/partner/client";
import { draftPage } from "@/lib/partner/draft";
import type { AiProfile } from "@/lib/profile-fields";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const DRAFT_DAILY_LIMIT = Number(process.env.DRAFT_DAILY_LIMIT ?? 20);

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return fail(503, "Your AI partner is not set up yet.");
  }
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  let exerciseId = "";
  try {
    exerciseId = String((await request.json()).exerciseId ?? "");
  } catch {
    return fail(400, "Something went wrong. Please try again.");
  }
  const found = findExercise(exerciseId);
  if (!found || !draftFields(found.exercise).length) return fail(400, "This page has no draft.");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("consent_ai, language")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profileRow?.consent_ai) return fail(403, "Your AI partner is switched off. You can switch it on in My settings.");

  // Drafts have their own daily limit, counted in the usage log (people may read their own rows).
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("usage_log")
    .select("id", { count: "exact", head: true })
    .eq("request_type", "draft")
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= DRAFT_DAILY_LIMIT) {
    return fail(429, "You asked for many drafts today. Please come back tomorrow.");
  }

  const [answerRows, current] = await Promise.all([
    supabase.from("answers").select("exercise_id, field_id, value"),
    supabase.from("ai_profile").select("profile").eq("user_id", user.id).maybeSingle(),
  ]);
  const answers: Answers = {};
  for (const a of answerRows.data ?? []) (answers[a.exercise_id] ??= {})[a.field_id] = a.value;

  try {
    const result = await draftPage(
      anthropicClient(),
      exerciseId,
      answers,
      (current.data?.profile ?? {}) as AiProfile,
      profileRow.language,
    );
    if (!result) return fail(502, "Your AI partner could not write a draft this time.");
    if (!Object.keys(result.drafts).length) {
      return fail(422, "There is not enough in your answers yet to draft this page. Fill in the pages of this part first.");
    }

    await supabase.from("part_results").upsert({
      user_id: user.id,
      part_id: exerciseId,
      ai_draft: JSON.stringify(result.drafts),
      updated_at: new Date().toISOString(),
    });
    const u = result.usage;
    console.log(`draft: in=${u.input_tokens} out=${u.output_tokens}`); // numbers only
    await supabaseAdmin()
      ?.from("usage_log")
      .insert({
        user_id: user.id,
        request_type: "draft",
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_read_tokens: u.cache_read_input_tokens ?? 0,
      });
    return Response.json({ drafts: result.drafts });
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`draft: API error ${error.status}`);
    else console.error("draft: unexpected error", (error as Error).name);
    return fail(502, "Your AI partner needs a moment. Please try again.");
  }
}
