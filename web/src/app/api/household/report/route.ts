/*
 * The other person's answers, for the result documents (spec §6.8, slice 3).
 *
 * A couple should get one Decision rather than two that disagree, so the
 * documents print the shared facts once and the personal answers twice. This
 * hands over the second voice, and only where the comparison is already open:
 * both of them have finished that page and neither is keeping it private.
 *
 * A page one of them has not finished is simply absent, and the document
 * prints one voice for it, which is the truth about where they are.
 */
import { comparePage, householdOf, otherName } from "@/lib/household-server";
import { fullStep } from "@/lib/content-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";
import { pageKind } from "@/lib/together-app";

export const runtime = "nodejs";

/** The personal pages of the steps asked for. */
function personalPages(steps: number[]): string[] {
  const ids: string[] = [];
  for (const step of steps) {
    const content = fullStep(step);
    if (!content) continue;
    for (const part of content.parts) {
      for (const exercise of part.exercises ?? []) ids.push(exercise.id);
      if (part.summary) ids.push(part.summary.id);
    }
  }
  return ids.filter((id) => pageKind(id) === "mine");
}

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const admin = supabaseAdmin();
  if (!admin) return Response.json({ role: "alone" });

  const { household } = await householdOf(admin, user.id);
  if (household.role === "alone" || !household.otherId) return Response.json({ role: "alone" });

  const asked = (new URL(request.url).searchParams.get("steps") ?? "1,2,3")
    .split(",")
    .map(Number)
    .filter((n) => n >= 1 && n <= 3);

  const pages = personalPages(asked.length ? asked : [1, 2, 3]);
  const found = await Promise.all(
    pages.map(async (id) => [id, await comparePage(admin, household, user.id, id)] as const),
  );

  const answers: Record<string, Record<string, unknown>> = {};
  for (const [id, state] of found) {
    if (state.may && state.theirs) answers[id] = state.theirs;
  }

  return Response.json(
    { name: await otherName(admin, household), answers },
    { headers: { "cache-control": "no-store" } },
  );
}
