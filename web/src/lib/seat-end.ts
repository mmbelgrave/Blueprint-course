/**
 * When a partner seat ends (lawyer, 24 October, item B4d).
 *
 * The seat comes with the buyer's purchase, so it ends when that purchase
 * does: a withdrawal, a refund, or the buyer deleting their account. The
 * partner is then in a position nobody would want to be in by surprise, so
 * three things have to happen, in this order:
 *
 *   1. The seat is marked ended, and the ending is recorded against the
 *      partner. The seat row belongs to the buyer and goes with the buyer's
 *      account, so it cannot be the memory of its own ending.
 *   2. The partner is emailed at once, with the date and how to download
 *      their answers.
 *   3. Thirty days later their personal answers are deleted. The shared
 *      answers stay with the buyer, which is where they have always been.
 *
 * Steps 2 and 3 are done by the daily sweep, from the row this file writes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** How long a partner keeps their answers after the seat ends. */
export const SEAT_DATA_DAYS = 30;

/** How long an unused invitation stands before it is thrown away (item B4b). */
export const INVITATION_DAYS = 30;

/**
 * The partner's own writing.
 *
 * Everything in WRITTEN_BY_PERSON except their profile, which is their name
 * and their currency and is what lets them sign in without filling the first
 * screen in again, and except the questions they sent to Help, which have
 * their own twelve months and are not answers.
 */
export const PARTNER_ANSWERS = [
  "answers",
  "exercise_status",
  "conversations",
  "ai_profile",
  "part_results",
  "feedback",
  "page_feedback",
  "video_progress",
  "private_pages",
] as const;

export type Ending = {
  id: number;
  partner_id: string;
  email: string;
  ended_at: string;
  notified_at: string | null;
  data_deleted_at: string | null;
};

/**
 * Mark one seat ended and record the ending.
 *
 * Safe to call twice: the seat is only updated while it is still open, and an
 * ending is only written when there is not already an open one for this
 * partner.
 */
export async function endSeat(
  admin: SupabaseClient,
  seat: { buyer_id: string; partner_id: string | null; email: string; status: string },
  reason: string,
): Promise<void> {
  if (seat.status !== "ended") {
    await admin
      .from("partner_seats")
      .update({ status: "ended", ended_at: new Date().toISOString(), ended_reason: reason })
      .eq("buyer_id", seat.buyer_id)
      .neq("status", "ended");
  }
  /*
   * An invitation nobody used has nobody to write to: no partner, or a
   * partner who never signed in. Their address goes with the seat row.
   */
  if (!seat.partner_id || seat.status !== "active") return;

  const { data: open } = await admin
    .from("partner_endings")
    .select("id")
    .eq("partner_id", seat.partner_id)
    .is("data_deleted_at", null)
    .limit(1);
  if ((open ?? []).length > 0) return;

  await admin
    .from("partner_endings")
    .insert({ partner_id: seat.partner_id, email: seat.email, reason });
}

/**
 * The letter the partner gets the day the seat ends.
 *
 * It says what has happened, what they still have, and by when. No link to
 * sign in: §3.1 says the code is asked for, never sent.
 */
export function seatEndedMail(o: { appUrl: string; email: string; endedOn: string; deleteOn: string }) {
  const text = [
    "Hello,",
    "",
    `Your seat on The Made Real Blueprint ended on ${o.endedOn}. The purchase it`,
    "came with has ended, and a seat cannot stand on its own.",
    "",
    "Your answers are still yours. To keep them, sign in with this address",
    `(${o.email}) at ${o.appUrl}/answers and use Download the file. You get a zip`,
    "with your answers as a document, the same answers as a data file, and the",
    "pictures you added.",
    "",
    `Please do that before ${o.deleteOn}. On that day your own answers are`,
    "deleted. The pages you filled in together stay with the person who bought",
    "the course, without your name on them.",
    "",
    "If you think this is a mistake, reply to this email.",
    "",
    "Mwata",
    "The Made Real Blueprint",
  ].join("\n");

  return { subject: "Your seat on The Made Real Blueprint has ended", text };
}

/** The day the partner's answers go, from the day the seat ended. */
export function deleteDay(endedAt: string, days: number = SEAT_DATA_DAYS): Date {
  const day = new Date(endedAt);
  day.setDate(day.getDate() + days);
  return day;
}

/** Written as people read dates in this app. */
export const asDay = (when: Date | string) =>
  new Date(when).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
