/*
 * The caption track, handed over by us rather than by the CDN (spec §6.4).
 *
 * A text track is not like a video: the browser refuses one from another
 * address unless the whole player is put into cross-origin mode, and Bunny
 * sends no cross-origin header with the file. Proved in the live app on 16
 * October: the video played, the track element reported an error, and the
 * same address fetched by hand answered 200 with proper WEBVTT in it.
 *
 * So this route fetches the signed file on the server and serves it from our
 * own address. The browser sees a same-origin track and loads it, the token
 * never reaches anybody, and the same access check as the video applies.
 */
import { fileUrl, looksLikeVideoId } from "@/lib/bunny";
import { supabaseServer } from "@/lib/supabase-server";
import { mayWatch } from "@/lib/video-access";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Bunny refuses a request with no referer when Allowed domains is in use. */
const REFERER = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maderealblueprint.com";

/** The spellings Bunny may have filed the track under; the path is case-sensitive. */
const CAPTION_FILES = ["captions/EN.vtt", "captions/en.vtt", "captions/en-GB.vtt", "captions/en-US.vtt"];

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
  if (!looksLikeVideoId(videoId)) return fail(400, "That is not a video.");

  const allowed = await mayWatch(supabase, user.id, {
    moduleId: params.get("module"),
    step: Number(params.get("step")),
  });
  if (!allowed.ok) return fail(allowed.status, allowed.error);

  for (const file of CAPTION_FILES) {
    const res = await fetch(fileUrl({ cdn, videoId, key, file }), {
      headers: { referer: REFERER },
      cache: "no-store",
    });
    if (!res.ok) continue;
    const text = await res.text();
    return new Response(text, {
      headers: {
        "content-type": "text/vtt; charset=utf-8",
        // A caption file changes about as often as the video it belongs to.
        "cache-control": "private, max-age=3600",
      },
    });
  }
  return fail(404, "There are no captions for this video.");
}
