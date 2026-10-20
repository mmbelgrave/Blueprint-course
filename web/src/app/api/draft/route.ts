// "Help me draft this": the AI partner drafts a summary page from the person's
// own answers. The draft is stored (part_results.ai_draft) and shown next to the
// boxes; the person decides what goes in.
import Anthropic from "@anthropic-ai/sdk";
import { isFreeAccount, myAccess } from "@/lib/access-server";
import type { Answers } from "@/lib/backend";
import { whyNoAi } from "@/lib/consent-server";
import { findExercise } from "@/lib/content";
import { draftFields } from "@/lib/drafts";
import { anthropicClient } from "@/lib/partner/client";
import { draftPage } from "@/lib/partner/draft";
import type { AiProfile } from "@/lib/profile-fields";
import { answersIMaySee } from "@/lib/household-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";

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
  const auth = await sessionUser(supabase);
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

  // Consent first, every time (legal review of 18 October, part 1).
  const refused = await whyNoAi(user.id);
  if (refused) return fail(403, refused);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("language")
    .eq("user_id", user.id)
    .maybeSingle();

  // The AI partner, drafts and all, comes with the course (§6.2).
  if (isFreeAccount(await myAccess(supabase, user.id))) {
    return fail(403, "Your AI partner comes with the course.");
  }

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

  const [answers, current] = await Promise.all([
    answersIMaySee(supabase, supabaseAdmin(), user.id) as Promise<Answers>,
    supabase.from("ai_profile").select("profile").eq("user_id", user.id).maybeSingle(),
  ]);


  try {
    const result = await draftPage(
      anthropicClient(),
      exerciseId,
      answers,
      (current.data?.profile ?? {}) as AiProfile,
      profileRow?.language ?? "en",
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
