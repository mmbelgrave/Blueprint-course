/**
 * Deleting an account, and the seat that goes with it.
 *
 * The two lists of tables live in lib/forget-account.ts, which imports
 * nothing, so the test that walks the SQL and checks that every table of a
 * person is accounted for can read them with plain node. The work itself is
 * here, where it may import what it needs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { endSeat } from "@/lib/seat-end";
import type { SeatClosedReason } from "@/lib/seat-end";
import { tellBuyerSeatClosed, tellPartnerNow } from "@/lib/seat-notify";

/**
 * The seat, when one of the two people leaves (lawyer, 24 October, item B4).
 *
 * A partner who leaves closes their own seat: their personal answers go with
 * their account, and the shared answers stay with the buyer with the
 * partner's name taken off them, because "Ben changed this" about somebody
 * who is no longer here is a name kept for nothing.
 *
 * A buyer who leaves ends the seat for both of them, and the ending is
 * recorded so the partner is written to and their own answers go thirty days
 * later.
 */
export async function closeSeatsFor(
  admin: SupabaseClient,
  userId: string,
  /** Why this account is going, for the letter to the buyer. */
  reason: SeatClosedReason = "asked",
) {
  const { data: seats } = await admin
    .from("partner_seats")
    .select("buyer_id, email, partner_id, status")
    .or(`buyer_id.eq.${userId},partner_id.eq.${userId}`)
    .neq("status", "ended");

  for (const seat of (seats ?? []) as { buyer_id: string; email: string; partner_id: string | null; status: string }[]) {
    if (seat.buyer_id === userId) {
      await endSeat(admin, seat, "account_deleted").catch(() => undefined);
      // The same hour, not the next morning (item B4d).
      if (seat.partner_id) await tellPartnerNow(admin, seat.partner_id).catch(() => undefined);
      continue;
    }
    await admin
      .from("partner_seats")
      .update({ status: "ended", ended_at: new Date().toISOString(), ended_reason: "account_deleted" })
      .eq("buyer_id", seat.buyer_id)
      .neq("status", "ended")
      .then(() => undefined, () => undefined);
    await admin
      .from("answers")
      .update({ changed_by: null })
      .eq("changed_by", userId)
      .then(() => undefined, () => undefined);
    /*
     * And the buyer is told, so they know the seat is free again (lawyer,
     * 24 October). Their own access is not affected, which the letter says.
     */
    await tellBuyerSeatClosed(admin, seat.buyer_id, seat.email, reason).catch(() => undefined);
  }
}

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
export async function deleteEverything(
  admin: SupabaseClient,
  userId: string,
  /** Why, for the letter the other person in a household gets. */
  reason: SeatClosedReason = "asked",
) {
  await deletePictures(admin, userId);
  /*
   * The seat first, while the rows are still there to read. A buyer who
   * leaves takes the seat row with them, so the ending has to be written
   * down before the account goes (item B4d).
   */
  await closeSeatsFor(admin, userId, reason);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`the account could not be deleted: ${error.message}`);
}
