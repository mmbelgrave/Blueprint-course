/*
 * A signed address for one video (spec §6.4).
 *
 * The signing key stays here. The browser asks for an address, this decides
 * whether that person may have one, and hands back something that works for a
 * few minutes. Checking access here is the point: the copy of the rules running
 * in the browser decides what to draw, this one decides what may be watched.
 *
 * It answers with the whole set the player needs, because one token covers the
 * video's whole folder: the stream, the picture to show before it starts, the
 * caption track and the audio-only version. The last two are asked for rather
 * than assumed, so adding captions in Bunny is enough to make them appear.
 */
import { fileUrl, folderUrl, looksLikeVideoId } from "@/lib/bunny";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";
import { mayWatch } from "@/lib/video-access";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Bunny refuses a request with no referer when Allowed domains is in use. */
const REFERER = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maderealblueprint.com";

/** Is this file in the folder? A video with no captions must not get a broken track. */
async function there(address: string): Promise<boolean> {
  try {
    const res = await fetch(address, { method: "HEAD", headers: { referer: REFERER }, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/*
 * Bunny files a caption track under the language code it was given, and the
 * CDN path is case-sensitive: the Introduction track sits at captions/EN.vtt.
 * Rather than make that a rule somebody has to remember, the few spellings are
 * tried and the first one that answers is used.
 */
const CAPTION_FILES = ["captions/EN.vtt", "captions/en.vtt", "captions/en-GB.vtt", "captions/en-US.vtt"];

async function captionTrack(cdn: string, videoId: string, key: string, mine: string) {
  // All four at once: four turns of a loop added two seconds to pressing play.
  const tried = await Promise.all(
    CAPTION_FILES.map((file) => there(fileUrl({ cdn, videoId, key, file }))),
  );
  /*
   * The address handed over is ours, not the CDN is: a text track from another
   * address is refused by the browser unless the whole player is put into
   * cross-origin mode, and Bunny sends no header to allow it.
   */
  return tried.some(Boolean) ? [{ src: mine, label: "English", language: "en", default: true }] : [];
}

export async function GET(request: Request) {
  const cdn = process.env.NEXT_PUBLIC_BUNNY_CDN;
  const key = process.env.BUNNY_TOKEN_KEY;
  if (!cdn || !key) return fail(503, "Video is not set up yet.");

  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const params = new URL(request.url).searchParams;
  const videoId = params.get("video") ?? "";
  const audioId = params.get("audio") ?? "";
  const moduleId = params.get("module");
  const step = Number(params.get("step"));

  // A video id goes into a web address, so it is checked rather than trusted.
  if (!looksLikeVideoId(videoId)) return fail(400, "That is not a video.");
  if (audioId && !looksLikeVideoId(audioId)) return fail(400, "That is not a video.");

  const allowed = await mayWatch(supabase, user.id, { moduleId, step });
  if (!allowed.ok) return fail(allowed.status, allowed.error);

  const { folder, expires } = folderUrl({ cdn, videoId, key });
  /*
   * The sound-only version is its own upload with its own folder, so it is
   * signed separately. Bunny makes no audio.mp3 of its own, which is checked
   * here too in case a library ever does.
   */
  const audioFolder = audioId ? folderUrl({ cdn, videoId: audioId, key }).folder : null;
  // Our own address for the track, carrying the same question this route asked.
  const belongs = moduleId ? `module=${encodeURIComponent(moduleId)}` : `step=${step}`;
  const [captions, besideIt] = await Promise.all([
    captionTrack(cdn, videoId, key, `/api/video/captions?video=${encodeURIComponent(videoId)}&${belongs}`),
    there(`${folder}audio.mp3`),
  ]);

  // Never cached: an address that outlives its token is worse than none.
  return Response.json(
    {
      url: `${folder}playlist.m3u8`,
      poster: `${folder}thumbnail.jpg`,
      audio: audioFolder ? `${audioFolder}playlist.m3u8` : besideIt ? `${folder}audio.mp3` : null,
      captions,
      expires,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
