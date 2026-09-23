// The AI partner: one streamed reply per request. Server-only — the Anthropic
// API key never reaches the browser. Answer texts are never written to logs.
import Anthropic from "@anthropic-ai/sdk";
import type { Answers, Profile } from "@/lib/backend";
import { findExercise } from "@/lib/content";
import { anthropicClient } from "@/lib/partner/client";
import { contextMessage, HELPERS, partnerRequest, type HelperType } from "@/lib/partner/prompt";
import { STATUS_MARK, type PartnerStatus } from "@/lib/partner/protocol";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const DAILY_LIMIT = Number(process.env.PARTNER_DAILY_LIMIT ?? 80);
const MAX_MESSAGE_CHARS = 4000;
const HISTORY_MESSAGES = 30;
const MAX_PAGE_ANSWERS_CHARS = 50_000;

const FRIENDLY_ERROR = "Your AI partner needs a moment. Please try again.";

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, "The AI partner is not set up yet.");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fail(503, "Please sign in to use your AI partner.");

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  // Request body: which page, and either a message or a helper button.
  let body: { exerciseId?: unknown; message?: unknown; helper?: unknown; pageAnswers?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Something went wrong. Please try again.");
  }
  const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId : "";
  if (!findExercise(exerciseId)) return fail(400, "Unknown page.");
  const helper = typeof body.helper === "string" && body.helper in HELPERS ? (body.helper as HelperType) : null;
  let message = typeof body.message === "string" ? body.message.trim() : "";
  if (!helper && !message) return fail(400, "Please write a message first.");
  let trimmed = false;
  if (message.length > MAX_MESSAGE_CHARS) {
    message = message.slice(0, MAX_MESSAGE_CHARS);
    trimmed = true;
  }

  // Consent and profile.
  const { data: profileRow } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profileRow?.consent_ai) return fail(403, "Your AI partner is switched off. You can switch it on in My settings.");
  const profile = profileRow as Profile;

  // Daily limit since midnight UTC. Counted in the usage log, which people cannot
  // change (they can delete their own chats) — review R2 concern 2. Without the
  // service key the usage log is not written, so the chats are counted instead.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = supabaseAdmin()
    ? await supabase
        .from("usage_log")
        .select("id", { count: "exact", head: true })
        .like("request_type", "chat%")
        .gte("created_at", since.toISOString())
    : await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("role", "user")
        .gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return fail(429, "You talked a lot with your AI partner today. Please come back tomorrow.");
  }

  // Everything the partner needs: answers, what it knows, and this page's chat.
  const [answerRows, aiProfile, history] = await Promise.all([
    supabase.from("answers").select("exercise_id, field_id, value"),
    supabase.from("ai_profile").select("profile").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("conversations")
      .select("role, content, helper_type")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_MESSAGES),
  ]);
  const answers: Answers = {};
  for (const a of answerRows.data ?? []) (answers[a.exercise_id] ??= {})[a.field_id] = a.value;
  // The page may hold newer text than the database (autosave waits a moment).
  // Ignored when unreasonably large, so nobody can send a huge request at our cost.
  if (
    body.pageAnswers &&
    typeof body.pageAnswers === "object" &&
    !Array.isArray(body.pageAnswers) &&
    JSON.stringify(body.pageAnswers).length <= MAX_PAGE_ANSWERS_CHARS
  ) {
    answers[exerciseId] = { ...answers[exerciseId], ...(body.pageAnswers as Record<string, unknown>) };
  }

  const visibleText = helper ? HELPERS[helper].label : message;
  const requestText = helper ? HELPERS[helper].request : message;

  const past = (history.data ?? []).reverse();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: contextMessage({ profile, aiProfile: aiProfile.data?.profile, answers, exerciseId }),
    },
    // Earlier turns on this page. Helper presses are stored with their label.
    ...past.map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        m.role === "user" && m.helper_type && m.helper_type in HELPERS
          ? HELPERS[m.helper_type as HelperType].request
          : m.content,
    })),
    { role: "user", content: requestText },
  ];

  const client = anthropicClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";
      let status: PartnerStatus = { ok: true, trimmed };
      try {
        const response = client.beta.messages.stream(partnerRequest(messages));
        response.on("text", (delta) => {
          reply += delta;
          controller.enqueue(encoder.encode(delta));
        });
        const final = await response.finalMessage();

        if (final.stop_reason === "refusal") {
          // The whole fallback chain declined. Say so kindly instead of an empty reply.
          const note = reply
            ? ""
            : "I am sorry, I cannot help with this here. If you are going through something difficult, please talk to someone you trust or a professional.";
          reply += note;
          controller.enqueue(encoder.encode(note));
        } else if (final.stop_reason === "max_tokens") {
          // Cut off by the length limit (review R2 concern 4): say so instead of looking complete.
          const note = "\n\n(My answer was cut off. Please ask me again.)";
          reply += note;
          controller.enqueue(encoder.encode(note));
        }

        const u = final.usage;
        // Numbers only — never message or answer text.
        console.log(
          `partner: stop=${final.stop_reason} in=${u.input_tokens} out=${u.output_tokens} cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}`,
        );

        if (reply.trim()) {
          await supabase.from("conversations").insert([
            { user_id: user.id, exercise_id: exerciseId, role: "user", content: visibleText, helper_type: helper },
            { user_id: user.id, exercise_id: exerciseId, role: "assistant", content: reply },
          ]);
        }
        await supabaseAdmin()
          ?.from("usage_log")
          .insert({
            user_id: user.id,
            request_type: helper ? `chat:${helper}` : "chat",
            input_tokens: u.input_tokens,
            output_tokens: u.output_tokens,
            cache_read_tokens: u.cache_read_input_tokens ?? 0,
          });
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) console.error("partner: rate limited");
        else if (error instanceof Anthropic.APIError) console.error(`partner: API error ${error.status}`);
        else console.error("partner: unexpected error", (error as Error).name);
        status = { ok: false, error: FRIENDLY_ERROR };
      }
      controller.enqueue(encoder.encode(STATUS_MARK + JSON.stringify(status)));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
