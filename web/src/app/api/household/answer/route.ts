/**
 * Writing one shared answer (spec §6.8).
 *
 * The browser sends shared answers here instead of straight to Supabase,
 * because they live on the buyer's rows and row-level security says "your own
 * rows only". That rule is not loosened; this route is the one door, and it
 * checks the household and the page before it opens.
 *
 * `loadedAt` is when the browser last had the truth. If the other person has
 * written this same box since then, nothing is saved: the answer comes back
 * with theirs, and the page asks which one to keep. Sending `force` saves it
 * anyway, which is that answer.
 */
import { otherName, writeShared } from "@/lib/household-server";
import { householdOf } from "@/lib/household-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const admin = supabaseAdmin();
  if (!admin) return fail(503, "Shared answers are not set up yet.");

  let body: { exerciseId?: string; fieldId?: string; value?: unknown; loadedAt?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return fail(400, "That request could not be read.");
  }
  const { exerciseId, fieldId, loadedAt } = body;
  if (!exerciseId || !fieldId) return fail(400, "Which answer?");

  const { household } = await householdOf(admin, user.id);
  if (household.role === "alone") return fail(403, "You have no partner seat.");

  const result = await writeShared(admin, household, user.id, {
    exerciseId,
    fieldId,
    value: body.value,
    // No `loadedAt` means the browser cannot say what it had, so the safe
    // reading is "the beginning of time": anything the other person wrote
    // counts as newer and the page gets asked.
    loadedAt: loadedAt ?? new Date(0).toISOString(),
    force: body.force === true,
  });

  if ("error" in result) return fail(400, result.error);
  if (result.saved) return Response.json({ saved: true });

  return Response.json({
    saved: false,
    conflict: { at: result.conflict.kind === "theirs" ? result.conflict.at : null, name: await otherName(admin, household) },
    theirs: result.theirs,
  });
}
