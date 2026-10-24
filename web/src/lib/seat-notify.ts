/**
 * Telling the partner, the moment their seat ends (lawyer, 24 October, B4d).
 *
 * The daily routine writes this letter too, and that is the net underneath.
 * But "at once" means the same hour, not the next morning, so the two places
 * where a person ends a purchase themselves (a refund, and a buyer deleting
 * their account) send it here and then.
 *
 * Whoever sends it stamps `notified_at`, so it goes once. A letter that could
 * not be sent leaves the stamp empty and the daily routine tries again.
 *
 * Kept apart from lib/seat-end.ts on purpose: that file holds the rules and
 * imports nothing, so the tests can read it with plain node.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { asDay, deleteDay, seatClosedMail, seatEndedMail, type Ending, type SeatClosedReason } from "@/lib/seat-end";
import { sendMail } from "@/lib/send-mail";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maderealblueprint.com";

/**
 * Tell the buyer that the other seat is empty again (lawyer, 24 October).
 *
 * The buyer's own access is untouched, so this is news rather than a warning:
 * the seat is free and they can invite somebody again. Their address comes
 * from their account, because the seat row is about to be gone.
 */
export async function tellBuyerSeatClosed(
  admin: SupabaseClient,
  buyerId: string,
  partnerEmail: string,
  reason: SeatClosedReason,
): Promise<boolean> {
  const { data } = await admin.auth.admin.getUserById(buyerId);
  const to = data?.user?.email;
  if (!to) return false;
  return sendMail(to, seatClosedMail({ appUrl: APP_URL, partnerEmail, reason }));
}

/** Write to this partner about the ending that has not been told yet. */
export async function tellPartnerNow(admin: SupabaseClient, partnerId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("partner_endings")
    .select("id, partner_id, email, ended_at, notified_at, data_deleted_at")
    .eq("partner_id", partnerId)
    .is("notified_at", null)
    .is("data_deleted_at", null)
    .order("ended_at", { ascending: false })
    .limit(1);
  if (error || (data ?? []).length === 0) return false;

  const ending = (data as Ending[])[0];
  const sent = await sendMail(
    ending.email,
    seatEndedMail({
      appUrl: APP_URL,
      email: ending.email,
      endedOn: asDay(ending.ended_at),
      deleteOn: asDay(deleteDay(ending.ended_at)),
    }),
  );
  if (!sent) return false;
  await admin.from("partner_endings").update({ notified_at: new Date().toISOString() }).eq("id", ending.id);
  return true;
}
