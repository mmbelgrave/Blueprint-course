/*
 * The picture a video shows before it starts (spec §6.4).
 *
 * The thumbnail sits in the same locked folder as the video, so it needs a
 * signed address like everything else. Rather than make the page fetch one and
 * then set it, this route checks who is asking and sends them on to the signed
 * address: the slot can then use it as an ordinary image, and the page shows
 * the still the moment it opens.
 *
 * The address it sends people to expires in minutes, so the answer itself must
 * not be kept by anything in between.
 */
import { folderUrl, looksLikeVideoId } from "@/lib/bunny";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";
import { mayWatch } from "@/lib/video-access";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

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
  if (!looksLikeVideoId(videoId)) return fail(400, "That is not a video.");

  const allowed = await mayWatch(supabase, user.id, {
    moduleId: params.get("module"),
    step: Number(params.get("step")),
  });
  if (!allowed.ok) return fail(allowed.status, allowed.error);

  const { folder } = folderUrl({ cdn, videoId, key });
  return Response.redirect(`${folder}thumbnail.jpg`, 302);
}
