/*
 * The consent screen talks to this (legal review of 18 October, part 1).
 *
 * GET says what this person has already agreed to, so the panel can draw the
 * screen or the chat. POST writes down an answer they just gave.
 *
 * The browser cannot write a consent row itself: row-level security allows
 * reading your own history and nothing else. Everything goes through here,
 * where the user id comes from the session rather than from the request.
 */
import { WORDING_VERSION, type ConsentKind } from "@/lib/consent";
import { myConsent, recordConsent } from "@/lib/consent-server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return Response.json({ configured: false });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");

  const state = await myConsent(auth.user.id);
  if (!state) return fail(503, "That could not be read. Please try again.");
  return Response.json(state);
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fail(503, "That is not set up yet.");
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "That request could not be read.");
  }

  const answer: Partial<Record<ConsentKind, boolean>> = {};
  if (typeof body.ai === "boolean") answer.ai = body.ai;
  if (typeof body.founder === "boolean") answer.founder_access = body.founder;
  // Special categories ride on the first tick. Agreeing to the second while
  // refusing the first would be a consent to something that never happens.
  if (answer.ai === false) answer.ai_special = false;
  else if (typeof body.special === "boolean") answer.ai_special = body.special;

  if (Object.keys(answer).length === 0) return fail(400, "There was nothing to record.");

  const done = await recordConsent(auth.user.id, answer, body.from === "settings" ? "settings" : "app");
  if (!done) return fail(503, "That could not be saved. Please try again.");
  return Response.json({ ...done.state, written: done.written, version: WORDING_VERSION });
}
