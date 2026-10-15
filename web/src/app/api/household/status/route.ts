/**
 * The progress of a shared page (spec §6.8).
 *
 * A page the household answers together is finished for both of them or for
 * neither, so its status is stored once, on the buyer's rows, like the answers
 * on it. Without this a partner opens Step 1 and finds a filled-in money table
 * marked "not started".
 */
import { householdOf, writeSharedStatus } from "@/lib/household-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });
const STATUSES = ["not_started", "in_progress", "done"];

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const admin = supabaseAdmin();
  if (!admin) return fail(503, "Shared answers are not set up yet.");

  let body: { exerciseId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return fail(400, "That request could not be read.");
  }
  if (!body.exerciseId || !body.status) return fail(400, "Which page, and how far?");
  if (!STATUSES.includes(body.status)) return fail(400, "That is not a status.");

  const { household } = await householdOf(admin, user.id);
  if (household.role === "alone") return fail(403, "You have no partner seat.");

  const result = await writeSharedStatus(admin, household, user.id, {
    exerciseId: body.exerciseId,
    status: body.status,
  });
  return "error" in result ? fail(400, result.error) : Response.json({ saved: true });
}
