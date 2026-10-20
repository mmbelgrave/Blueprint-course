/**
 * Removing one account and everything in it.
 *
 * Written once and used twice: by "Delete everything" in the app, and by the
 * quiet-account sweep. Two separate copies of this would eventually disagree
 * about something — most likely the pictures, which are the one thing that
 * does not go when the account row does.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Everything a person wrote, by table.
 *
 * "Delete everything I wrote" empties these and leaves the account standing,
 * so somebody who paid for the course can start their workbook again without
 * losing the course (Mwata, 20 October). Deleting the account as well takes
 * these with it, and the entitlement too.
 */
export const WRITTEN_BY_PERSON = [
  "answers",
  "exercise_status",
  "conversations",
  "ai_profile",
  "part_results",
  "feedback",
  "page_feedback",
  "questions",
  "video_progress",
  "private_pages",
  "profiles",
] as const;

/**
 * What stays when the account stays, and why.
 *
 * These are records rather than writing: what was bought, what was agreed,
 * what was asked back, what the app did on somebody's behalf. The privacy
 * page says the same thing in its own words, and a table that belongs to
 * neither list is a table nobody has decided about.
 */
export const KEPT_RECORDS: Record<string, string> = {
  entitlements: "what was bought; it goes only when the account does",
  consents: "the record that consent was given and withdrawn",
  withdrawals: "the record of a withdrawal from the contract",
  withdrawal_requests: "the same record, before it was settled",
  purchase_claims: "the record that a course was moved between accounts",
  partner_seats: "the seat belongs to the purchase, not to the writing",
  usage_log: "what the AI partner was asked to do, for security and limits",
  retention_notice: "the record that a quiet account was warned",
};

/**
 * Pictures live in the "boards" store, not in a table, so deleting the
 * account does not remove them by itself. Everything under the person's own
 * folder goes.
 */
export async function deletePictures(admin: SupabaseClient, userId: string) {
  const paths: string[] = [];
  const { data: pages } = await admin.storage.from("boards").list(userId);
  for (const page of pages ?? []) {
    const { data: files } = await admin.storage.from("boards").list(`${userId}/${page.name}`);
    for (const file of files ?? []) paths.push(`${userId}/${page.name}/${file.name}`);
  }
  if (paths.length) {
    const { error } = await admin.storage.from("boards").remove(paths);
    if (error) console.error("delete: some pictures could not be removed");
  }
}

/**
 * The pictures, then the account — which takes every table with it, because
 * each one references auth.users on delete cascade. Throws when the account
 * itself could not be removed, so a caller never reports a deletion that did
 * not happen.
 */
export async function deleteEverything(admin: SupabaseClient, userId: string) {
  await deletePictures(admin, userId);
  /*
   * A partner who leaves ends the seat rather than leaving it pointing at
   * nobody (6.8). A buyer who leaves takes the row with them: the seat belongs
   * to the purchase, and so do the shared answers.
   */
  await admin
    .from("partner_seats")
    .update({ status: "ended", ended_at: new Date().toISOString(), ended_reason: "account_deleted" })
    .eq("partner_id", userId)
    .neq("status", "ended")
    .then(() => undefined, () => undefined);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`the account could not be deleted: ${error.message}`);
}
