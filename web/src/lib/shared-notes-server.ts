/**
 * The notes made from shared pages, when one of the two people withdraws
 * (lawyer, 24 October, addition to item B2).
 *
 * His sentence is: "If either of you switches your AI partner off, it stops
 * using the pages you answered together, and the notes made from them are
 * deleted for both of you." The first half is the gate in lib/ai-sharing.ts.
 * This is the second half.
 *
 * It matters which way round that is. A note drawn from a page the two of
 * them answered together is made of both their words, so one person taking
 * their consent back is not only about their own copy: the other copy is made
 * of the same shared answers. Leaving it would keep the withdrawing person's
 * words in a note they have just asked us to stop making.
 *
 * Only the notes go. The answers on the shared pages are the household's work
 * and are not touched, and nothing is marked "forgotten": that is a standing
 * instruction somebody gives on purpose, and a withdrawal is not one. If both
 * of them switch the AI partner on again, the notes are made again from the
 * same pages.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { householdOf } from "@/lib/household-server";
import { PROFILE_FIELDS, type AiProfile, type ProfileKey } from "@/lib/profile-fields";
import { sharedNoteKeys } from "@/lib/together-app";

const emptyFor = (key: ProfileKey) => (PROFILE_FIELDS.find((f) => f.key === key)?.kind === "list" ? [] : "");

/**
 * Empty every shared-page note, in both accounts of this household.
 *
 * Returns how many accounts were written to: 0 for somebody working alone,
 * who has no shared pages and nothing to clear. Never throws, because this
 * runs behind a consent that has already been recorded and the record is the
 * part that must not be lost.
 */
export async function clearSharedNotes(admin: SupabaseClient | null, userId: string): Promise<number> {
  if (!admin) return 0;
  try {
    const { household } = await householdOf(admin, userId);
    if (!household.otherId) return 0;

    const keys = sharedNoteKeys() as ProfileKey[];
    let touched = 0;
    for (const who of [userId, household.otherId]) {
      const { data } = await admin.from("ai_profile").select("profile").eq("user_id", who).maybeSingle();
      const profile = ((data as { profile?: AiProfile } | null)?.profile ?? null) as AiProfile | null;
      if (!profile) continue;

      const next: AiProfile = { ...profile };
      let changed = false;
      for (const key of keys) {
        if (next[key] === undefined) continue;
        next[key] = emptyFor(key) as AiProfile[ProfileKey];
        changed = true;
      }
      if (!changed) continue;

      const { error } = await admin
        .from("ai_profile")
        .upsert({ user_id: who, profile: next, updated_at: new Date().toISOString() });
      if (error) {
        console.error("shared notes: could not be cleared for one account:", error.message);
        continue;
      }
      touched += 1;
    }
    return touched;
  } catch (e) {
    console.error("shared notes: could not be cleared:", e instanceof Error ? e.message : String(e));
    return 0;
  }
}
