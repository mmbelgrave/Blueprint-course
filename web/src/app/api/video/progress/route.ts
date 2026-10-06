// Where someone had got to in a video (spec §6.4). Kept on the server so the
// phone picks up where the laptop stopped, and so a new release (§3.13) or a
// closed tab loses nothing.
//
// Row-level security means a person can only ever read or write their own row;
// this route uses their own session, not the service role.
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");

  const ids = new URL(request.url).searchParams.get("ids");
  const wanted = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);

  let query = supabase.from("video_progress").select("video_id, seconds, duration");
  if (wanted.length) query = query.in("video_id", wanted);
  const { data, error } = await query;
  if (error) return fail(500, "We could not read where you had got to.");

  const progress: Record<string, { seconds: number; duration: number }> = {};
  for (const r of data ?? []) {
    progress[r.video_id as string] = { seconds: Number(r.seconds), duration: Number(r.duration) };
  }
  return Response.json({ progress });
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  let body: { videoId?: string; seconds?: number; duration?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "We could not read that.");
  }

  const videoId = String(body.videoId ?? "").slice(0, 120);
  const seconds = Number(body.seconds);
  const duration = Number(body.duration);
  if (!videoId) return fail(400, "Which video?");
  // A broken number would make "Continue at …" nonsense, so it is simply not kept.
  if (!Number.isFinite(seconds) || seconds < 0) return fail(400, "That is not a position.");

  const { error } = await supabase.from("video_progress").upsert(
    {
      user_id: user.id,
      video_id: videoId,
      seconds,
      duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,video_id" },
  );
  if (error) return fail(500, "That was not saved.");

  return Response.json({ ok: true });
}
