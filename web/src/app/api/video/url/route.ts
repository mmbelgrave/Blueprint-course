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
import { itemFor, stepFor } from "@/lib/access-app";
import { myAccess } from "@/lib/access-server";
import { folderUrl, looksLikeVideoId } from "@/lib/bunny";
import { supabaseServer } from "@/lib/supabase-server";

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

async function captionTrack(folder: string) {
  for (const file of CAPTION_FILES) {
    if (await there(folder + file)) {
      return [{ src: folder + file, label: "English", language: "en", default: true }];
    }
  }
  return [];
}

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
  const audioId = params.get("audio") ?? "";
  const moduleId = params.get("module");
  const step = Number(params.get("step"));

  // A video id goes into a web address, so it is checked rather than trusted.
  if (!looksLikeVideoId(videoId)) return fail(400, "That is not a video.");
  if (audioId && !looksLikeVideoId(audioId)) return fail(400, "That is not a video.");

  const entitlements = await myAccess(supabase, user.id);

  /*
   * A video belongs either to a step, which decides who may watch it, or to a
   * module of its own. The Introduction is the second kind: §6.2 gives it to a
   * free account, along with the free exercises.
   *
   * The step check used to be skipped when the step was not a number, and
   * "abc" is not a number, so ?step=abc walked straight past it. A step that
   * cannot be read is refused, not waved through.
   */
  if (moduleId) {
    const verdict = itemFor(moduleId, entitlements);
    if (!verdict.open) return fail(403, "This video is part of the course.");
  } else {
    if (!Number.isInteger(step) || step < 1) return fail(400, "That is not a step.");
    const verdict = stepFor(step, entitlements);
    if (!verdict.open) {
      return fail(403, verdict.why === "not-released" ? "This step is not open yet." : "This video is part of the course.");
    }
  }

  const { folder, expires } = folderUrl({ cdn, videoId, key });
  /*
   * The sound-only version is its own upload with its own folder, so it is
   * signed separately. Bunny makes no audio.mp3 of its own, which is checked
   * here too in case a library ever does.
   */
  const audioFolder = audioId ? folderUrl({ cdn, videoId: audioId, key }).folder : null;
  const [captions, besideIt] = await Promise.all([captionTrack(folder), there(`${folder}audio.mp3`)]);

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
