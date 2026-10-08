/*
 * "Download my answers" (spec §6.6).
 *
 * The privacy page promises that you may ask for a copy of what is stored
 * about you. This hands it over without anyone having to ask: everything this
 * person wrote, what their AI partner remembers, what they bought, the
 * questions they sent and the feedback they gave.
 *
 * Read with the person's own session, so row-level security decides what comes
 * out — this route can never hand over somebody else's rows, whatever it is
 * asked for.
 */
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  // Preview mode has no account and nothing stored on a server, so there is
  // nothing to hand over; say so rather than failing.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return Response.json({ error: "Preview mode keeps your answers in this browser only." }, { status: 503 });
  }
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const [profile, answers, statuses, aiProfile, results, conversations, entitlements, questions, feedback] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("answers").select("exercise_id, field_id, value, updated_at"),
      supabase.from("exercise_status").select("exercise_id, status, updated_at"),
      supabase.from("ai_profile").select("profile, updated_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("part_results").select("part_id, ai_draft, final_text, updated_at"),
      supabase.from("conversations").select("exercise_id, role, content, created_at").order("created_at"),
      supabase.from("entitlements").select("product, status, source, order_id, created_at, ended_at"),
      supabase.from("questions").select("topic, page, question, created_at").order("created_at"),
      supabase.from("feedback").select("part_id, rating, comment, created_at").order("created_at"),
    ]);

  const everything = {
    note: "Everything The Made Real Blueprint holds about you, on the day you asked for it. Your answers are your own.",
    taken_on: new Date().toISOString(),
    account: { email: user.email ?? null, since: user.created_at },
    profile: profile.data ?? null,
    answers: answers.data ?? [],
    pages_done: statuses.data ?? [],
    what_my_ai_partner_knows: aiProfile.data?.profile ?? null,
    results: results.data ?? [],
    chats_with_my_ai_partner: conversations.data ?? [],
    what_i_bought: entitlements.data ?? [],
    questions_i_asked: questions.data ?? [],
    feedback_i_gave: feedback.data ?? [],
  };

  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(everything, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="my-blueprint-answers-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}
