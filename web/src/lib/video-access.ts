import "server-only";
/**
 * May this person watch this video (spec §6.4)?
 *
 * A video belongs either to a step, which decides who may watch it, or to a
 * module of its own. The Introduction is the second kind: §6.2 gives it to a
 * free account along with the free exercises.
 *
 * Both the address route and the captions route ask this, so the two can never
 * disagree about who may watch what.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { itemFor, stepFor } from "@/lib/access-app";
import { myAccess } from "@/lib/access-server";

export type Belongs = { moduleId: string | null; step: number };

export type Allowed = { ok: true } | { ok: false; status: number; error: string };

export async function mayWatch(
  supabase: SupabaseClient,
  userId: string,
  belongs: Belongs,
): Promise<Allowed> {
  const entitlements = await myAccess(supabase, userId);

  if (belongs.moduleId) {
    const verdict = itemFor(belongs.moduleId, entitlements);
    return verdict.open ? { ok: true } : { ok: false, status: 403, error: "This video is part of the course." };
  }

  /*
   * The step check used to be skipped when the step was not a number, and
   * "abc" is not a number, so ?step=abc walked straight past it. A step that
   * cannot be read is refused, not waved through.
   */
  if (!Number.isInteger(belongs.step) || belongs.step < 1) {
    return { ok: false, status: 400, error: "That is not a step." };
  }
  const verdict = stepFor(belongs.step, entitlements);
  if (verdict.open) return { ok: true };
  return {
    ok: false,
    status: 403,
    error: verdict.why === "not-released" ? "This step is not open yet." : "This video is part of the course.",
  };
}
