/*
 * A note made from a page the household answers together (lawyer, 24
 * October, item B2): visible to both, and either of them can delete it.
 *
 * Each person's AI partner keeps its own notes, and some of those notes are
 * drawn from the pages the two of them answer together: the money, the
 * research, the plan. A note like that is about both of them, so one person
 * deleting it has to delete it on both sides. Nothing else about the notes
 * changes: a correction is somebody's own word for their own notes and stays
 * with them.
 *
 * This route can only ever empty a note and mark it forgotten, or allow it
 * again. It never writes a note's words, so there is nothing here that could
 * put one person's words into the other person's notes.
 */
import { householdOf } from "@/lib/household-server";
import type { AiProfile, ProfileKey } from "@/lib/profile-fields";
import { PROFILE_FIELDS } from "@/lib/profile-fields";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";
import { sharedNoteKeys } from "@/lib/together-app";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

/** The same change the page makes to its own copy, applied to one profile. */
function applied(profile: AiProfile, key: ProfileKey, forget: boolean): AiProfile {
  const without = (list: ProfileKey[] | undefined) => (list ?? []).filter((k) => k !== key);
  if (!forget) return { ...profile, _forgotten: without(profile._forgotten) };
  const empty = PROFILE_FIELDS.find((f) => f.key === key)!.kind === "list" ? [] : "";
  return {
    ...profile,
    [key]: empty,
    // The patterns note may repeat the topic; it is rebuilt at the next update.
    ...(profile._locked?.includes("patterns_and_tensions") ? {} : { patterns_and_tensions: [] }),
    _forgotten: [...without(profile._forgotten), key],
    _locked: without(profile._locked),
  };
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fail(503, "That is not set up yet.");
  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  if (!auth.user) return fail(401, "Please sign in again.");
  const admin = supabaseAdmin();
  if (!admin) return fail(503, "That could not be saved just now. Please try again.");

  let body: { key?: unknown; forget?: unknown };
  try {
    body = (await request.json()) as { key?: unknown; forget?: unknown };
  } catch {
    return fail(400, "That request could not be read.");
  }
  const key = String(body.key ?? "");
  const forget = body.forget !== false;
  if (!sharedNoteKeys().includes(key)) return fail(400, "That note is not one you share.");

  const { household } = await householdOf(admin, auth.user.id).catch(() => ({ household: null }));
  if (!household || !household.otherId) return fail(400, "You have nobody to share a note with.");

  const both = [auth.user.id, household.otherId];
  const out: Record<string, AiProfile> = {};
  for (const who of both) {
    const { data } = await admin.from("ai_profile").select("profile").eq("user_id", who).maybeSingle();
    const profile = ((data as { profile?: AiProfile } | null)?.profile ?? {}) as AiProfile;
    const next = applied(profile, key as ProfileKey, forget);
    const { error } = await admin
      .from("ai_profile")
      .upsert({ user_id: who, profile: next, updated_at: new Date().toISOString() });
    if (error) {
      console.error("shared note: could not be saved");
      return fail(500, "That could not be saved. Please try again.");
    }
    out[who] = next;
  }

  // Only this person's own notes go back to the browser.
  return Response.json({ profile: out[auth.user.id] });
}
