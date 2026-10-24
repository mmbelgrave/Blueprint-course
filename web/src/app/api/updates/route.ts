/*
 * The box under the email field: "Also send me an occasional email when
 * something new is ready" (lawyer, 24 October).
 *
 * It is a consent, so it is written down like one: the kind, the answer, and
 * the version of the words the person actually read. The browser cannot write
 * that row itself, because row-level security lets anybody read their own
 * history and change nothing, so it goes through here, where the user comes
 * from the session rather than from the request.
 *
 * Nobody is added to the list before they have typed the code from their
 * inbox: this route needs a session, and a session only exists after that.
 */
import { UPDATES_WORDING_VERSION } from "@/lib/legal";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fail(503, "That is not set up yet.");
  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  if (!auth.user) return fail(401, "Please sign in again.");

  const body = (await request.json().catch(() => ({}))) as { granted?: unknown };
  if (typeof body.granted !== "boolean") return fail(400, "Say yes or no.");

  const admin = supabaseAdmin();
  if (!admin) return fail(503, "That could not be saved. Please try again.");

  const { error } = await admin.from("consents").insert({
    user_id: auth.user.id,
    kind: "updates",
    granted: body.granted,
    wording_version: UPDATES_WORDING_VERSION,
    source: "app",
  });
  if (error) {
    // Most likely the 24 October migration has not been run yet.
    console.error("updates consent: not written:", error.message);
    return fail(503, "That could not be saved. Please try again.");
  }

  /*
   * The profile carries the same answer, because that is what Admin reads to
   * see who is on the list. A person who has not finished "Before you start"
   * has no profile row yet; their answer is written there instead, from the
   * tick that waits in the browser.
   */
  await admin
    .from("profiles")
    .update({ wants_updates: body.granted })
    .eq("user_id", auth.user.id)
    .then(
      () => undefined,
      () => undefined,
    );

  return Response.json({ ok: true });
}
