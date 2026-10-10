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
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`the account could not be deleted: ${error.message}`);
}
