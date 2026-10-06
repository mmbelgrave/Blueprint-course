// A question for Mwata: saved first, then emailed to him.
//
// Saving first is deliberate. The email can fail (no key yet, Resend down) and
// the question must not vanish with it: it is in the database and on the Admin
// page either way. The person is told the truth — "I have your question" — and
// that is true the moment the row is written.
import { steps } from "@/lib/content";
import { checkQuestion, supportTopics, topicLabel, type QuestionDraft } from "@/lib/support";
import { sendQuestionMail } from "@/lib/support-email";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

const TOPICS = supportTopics(steps.map((s) => s.step));

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");

  const { data, error } = await supabase
    .from("questions")
    .select("id, topic, page, question, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return fail(500, "We could not read your earlier questions.");

  return Response.json({
    questions: (data ?? []).map((q) => ({
      id: q.id,
      topic: topicLabel(TOPICS, q.topic),
      page: q.page,
      question: q.question,
      date: q.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  let body: QuestionDraft;
  try {
    body = (await request.json()) as QuestionDraft;
  } catch {
    return fail(400, "We could not read your question. Please try again.");
  }

  const draft: QuestionDraft = {
    topic: String(body.topic ?? ""),
    page: body.page ? String(body.page).slice(0, 120) : undefined,
    question: String(body.question ?? ""),
  };
  // The browser checks this too. This is the check that counts.
  const wrong = checkQuestion(draft);
  if (wrong) return fail(400, wrong);
  if (!TOPICS.some((t) => t.id === draft.topic)) return fail(400, "Please choose what your question is about.");

  const { error } = await supabase.from("questions").insert({
    user_id: user.id,
    topic: draft.topic,
    page: draft.page ?? null,
    question: draft.question.trim(),
    reply_by: "email",
    whatsapp: null,
  });
  if (error) return fail(500, "Your question was not saved. Please check your internet and try again.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const emailed = await sendQuestionMail({
    name: (profile?.first_name as string) || "",
    email: user.email ?? "",
    topicLabel: topicLabel(TOPICS, draft.topic),
    page: draft.page,
    question: draft.question,
    adminUrl: new URL(`/admin/${user.id}`, request.url).toString(),
  });

  return Response.json({ ok: true, emailed });
}
