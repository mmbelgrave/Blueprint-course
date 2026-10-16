/**
 * The household, as the app needs it (spec §6.8).
 *
 * Asked once when the app loads, and again when somebody wants to know what is
 * new. For a person working alone it answers "alone" and nothing else, so the
 * app behaves exactly as it did before seats existed.
 *
 * What it hands over is deliberately narrow: the shared answers, the shared
 * progress, who last wrote each shared answer as "me" or "them", and the other
 * person's first name. Never one of their personal answers.
 */
import { myEntitlements } from "@/lib/access-server";
import { householdEntitlements, joinAndRead, otherName, sharedState } from "@/lib/household-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const admin = supabaseAdmin();
  const at = new Date().toISOString();
  // Without the service role there is no household to read, and the app simply
  // works as it always has.
  if (!admin) return Response.json({ role: "alone", at });

  /*
   * A seat that cannot be read is not the same as no seat (review round 6,
   * R6-2). Saying "alone" here would send a household's answers to one
   * person's own rows, so this refuses instead: the browser keeps the
   * household unknown, holds shared answers in the queue, and asks again.
   */
  let household;
  try {
    ({ household } = await joinAndRead(admin, user.id));
  } catch (e) {
    console.error("household:", (e as Error).message);
    return Response.json({ error: "Could not read your household. Trying again shortly." }, { status: 503 });
  }
  if (household.role === "alone") return Response.json({ role: "alone", at });

  const [shared, name, mine] = await Promise.all([
    sharedState(admin, household),
    otherName(admin, household),
    myEntitlements(supabase),
  ]);
  const entitlements = await householdEntitlements(admin, household, mine);

  // The browser never needs the other person's id, so it does not get one.
  const changed: Record<string, { who: "me" | "them"; at: string }> = {};
  for (const [key, value] of Object.entries(shared.changed)) {
    changed[key] = { who: value.by === user.id ? "me" : "them", at: value.at };
  }

  return Response.json({
    role: household.role,
    email: household.email,
    waiting: household.waiting,
    other: household.otherId ? { name } : null,
    shared: { answers: shared.answers, statuses: shared.statuses, changed },
    entitlements,
    at,
  });
}
