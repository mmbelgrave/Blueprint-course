/*
 * A signed address for one video (spec §6.4).
 *
 * The signing key stays here. The browser asks for an address, this decides
 * whether that person may have one, and hands back something that works for a
 * few minutes. Checking access here is the point: the copy of the rules running
 * in the browser decides what to draw, this one decides what may be watched.
 */
import { stepFor } from "@/lib/access-app";
import { playbackUrl, looksLikeVideoId } from "@/lib/bunny";
import type { Entitlement } from "@/lib/access";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const cdn = process.env.NEXT_PUBLIC_BUNNY_CDN;
  const key = process.env.BUNNY_TOKEN_KEY;
  if (!cdn || !key) return fail(503, "Video is not set up yet.");

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const params = new URL(request.url).searchParams;
  const videoId = params.get("video") ?? "";
  const step = Number(params.get("step"));
  const file = params.get("audio") === "1" ? "audio.mp3" : "playlist.m3u8";

  // A video id goes into a web address, so it is checked rather than trusted.
  if (!looksLikeVideoId(videoId)) return fail(400, "That is not a video.");

  /*
   * A video belongs to a step, and the step decides who may watch it. The
   * check used to be skipped when the step was not a number — and "abc" is not
   * a number, so ?step=abc walked straight past it. A step that cannot be read
   * is now refused, not waved through.
   */
  if (!Number.isInteger(step) || step < 1) return fail(400, "That is not a step.");
  const { data } = await supabase.from("entitlements").select("product, status");
  const verdict = stepFor(step, (data ?? []) as Entitlement[]);
  if (!verdict.open) {
    return fail(403, verdict.why === "not-released" ? "This step is not open yet." : "This video is part of the course.");
  }

  const playback = playbackUrl({ cdn, videoId, key, file });
  // Never cached: an address that outlives its token is worse than none.
  return Response.json(playback, { headers: { "cache-control": "no-store" } });
}
