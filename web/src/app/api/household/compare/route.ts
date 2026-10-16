/**
 * The comparison (spec §6.8, slice 2).
 *
 * `?page=1.4` answers one page: have I written it, have they, may I see theirs,
 * and if I may, theirs. `?step=1` answers the same three questions for every
 * personal page in a step as yes or no, with none of their words in it, which
 * is what a step page needs to say "Ben has written 1.4 and 2.1".
 *
 * POST keeps a page private, or stops keeping it private.
 */
import { comparePage, compareStep, householdOf, setPrivate } from "@/lib/household-server";
import { fullStep } from "@/lib/content-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";
import { pageKind } from "@/lib/together-app";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Every page in a step that each person answers alone. */
function personalPagesOfStep(step: number): string[] {
  const content = fullStep(step);
  if (!content) return [];
  const ids: string[] = [];
  for (const part of content.parts) {
    for (const exercise of part.exercises ?? []) ids.push(exercise.id);
    if (part.summary) ids.push(part.summary.id);
  }
  return ids.filter((id) => pageKind(id) === "mine");
}

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const admin = supabaseAdmin();
  if (!admin) return Response.json({ role: "alone" });

  const { household } = await householdOf(admin, user.id);
  if (household.role === "alone" || !household.otherId) return Response.json({ role: "alone" });

  const params = new URL(request.url).searchParams;
  const page = params.get("page");
  const step = Number(params.get("step"));

  if (page) {
    if (pageKind(page) !== "mine") return fail(400, "That page is not one you each answer yourself.");
    return Response.json(await comparePage(admin, household, user.id, page));
  }
  if (step >= 1 && step <= 3) {
    return Response.json(await compareStep(admin, household, user.id, personalPagesOfStep(step)));
  }
  return fail(400, "Which page, or which step?");
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const admin = supabaseAdmin();
  if (!admin) return fail(503, "That is not set up yet.");

  let body: { exerciseId?: string; keepPrivate?: boolean };
  try {
    body = await request.json();
  } catch {
    return fail(400, "That request could not be read.");
  }
  if (!body.exerciseId) return fail(400, "Which page?");

  // Keeping a page to yourself only means something inside a household.
  const { household } = await householdOf(admin, user.id);
  if (household.role === "alone") return fail(403, "You have no partner seat.");

  const result = await setPrivate(admin, user.id, body.exerciseId, body.keepPrivate === true);
  return "error" in result ? fail(400, result.error) : Response.json({ keepPrivate: body.keepPrivate === true });
}
