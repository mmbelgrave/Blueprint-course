/**
 * The partner seat: inviting, and asking what the seat says (spec §6.8).
 *
 * One seat per purchase, set once. Changing it is an email to Mwata, which is
 * deliberate: a seat that could be moved from one person to another at will is
 * a way to hand the course around.
 *
 * Asking again with the same address sends the letter again, which is what
 * somebody does when it did not arrive.
 */
import { isFreeAccount, myEntitlements } from "@/lib/access-server";
import { findAccountByEmail } from "@/lib/find-account";
import { invitationProblem } from "@/lib/household";
import { householdOf, seatOf } from "@/lib/household-server";
import { PRODUCT } from "@/lib/content";
import { seatInvitation } from "@/lib/seat-email";
import { sendMail } from "@/lib/send-mail";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maderealblueprint.com";
const fail = (status: number, error: string) => Response.json({ error }, { status });

/** The admin trail, in the same place as the webhook's own story. */
async function log(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  event: string,
  email: string,
  detail: string,
  outcome = "done",
) {
  await admin
    .from("webhook_events")
    .insert({ source: "seat", event, email, outcome, detail })
    .then(() => undefined, () => undefined);
}

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in again.");
  const admin = supabaseAdmin();
  if (!admin) return Response.json({ seat: null, mayInvite: false });

  const seat = await seatOf(admin, auth.user.id);
  const entitlements = await myEntitlements(supabase);
  const mine = seat?.buyer_id === auth.user.id ? seat : null;
  return Response.json({
    seat: mine ? { email: mine.email, status: mine.status, joined: Boolean(mine.joined_at) } : null,
    // A free account has nothing to share, so there is no seat to give away.
    mayInvite: !isFreeAccount(entitlements),
    iAmThePartner: Boolean(seat && seat.partner_id === auth.user.id && seat.status !== "ended"),
  });
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return fail(401, "Please sign in again.");

  const admin = supabaseAdmin();
  if (!admin) return fail(503, "The partner seat is not set up yet.");

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return fail(400, "That request could not be read.");
  }
  const email = (body.email ?? "").trim().toLowerCase();

  const problem = invitationProblem(email, user.email);
  if (problem) return fail(400, problem);

  if (isFreeAccount(await myEntitlements(supabase))) {
    return fail(403, "The seat comes with the course.");
  }

  const { household } = await householdOf(admin, user.id);
  if (household.role === "partner") {
    return fail(403, "You are the partner on somebody else's seat.");
  }

  const existing = await seatOf(admin, user.id);
  if (existing && existing.status !== "ended") {
    // The same address again means "it never arrived". A different one means
    // a swap, which is not ours to do.
    if (existing.email.toLowerCase() !== email) {
      return fail(409, `Your seat is already with ${existing.email}. Send me an email if that has to change.`);
    }
  }

  // The address cannot be in another household, and somebody who owns the
  // Blueprint already does not need a seat on top of it.
  const theirId = await findAccountByEmail(admin, email).catch(() => null);
  if (theirId) {
    const { data: theirSeat } = await admin
      .from("partner_seats")
      .select("buyer_id, status")
      .eq("partner_id", theirId)
      .neq("status", "ended")
      .maybeSingle();
    if (theirSeat && theirSeat.buyer_id !== user.id) {
      return fail(409, "That address already has a seat with somebody else.");
    }
    const { data: theirs } = await admin
      .from("entitlements")
      .select("product")
      .eq("user_id", theirId)
      .eq("status", "active");
    if ((theirs ?? []).length > 0) {
      return fail(409, "That address already owns the Blueprint, so it does not need a seat.");
    }
  }

  /*
   * The account is made now rather than at their first sign-in. It costs
   * nothing, it sends no Supabase email of its own, and it means the seat works
   * even if sign-up is ever closed again: the address already exists, so asking
   * for a code is a normal sign-in.
   */
  let partnerId = theirId;
  if (!partnerId) {
    const { data: made, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error || !made?.user) return fail(502, "That invitation could not be set up. Please try again.");
    partnerId = made.user.id;
  }

  const { error: seatError } = await admin.from("partner_seats").upsert(
    {
      buyer_id: user.id,
      email,
      partner_id: partnerId,
      status: existing?.status === "active" ? "active" : "invited",
      invited_at: new Date().toISOString(),
    },
    { onConflict: "buyer_id" },
  );
  if (seatError) return fail(500, "The seat could not be saved.");

  const { data: me } = await supabase.from("profiles").select("first_name").eq("user_id", user.id).maybeSingle();
  const sent = await sendMail(
    email,
    seatInvitation({
      fromName: (me as { first_name?: string | null } | null)?.first_name ?? null,
      fromEmail: user.email ?? "",
      email,
      appUrl: APP_URL,
      productName: PRODUCT.name,
    }),
  );

  await log(
    admin,
    existing ? "seat_invitation_resent" : "seat_invited",
    email,
    `Invited by ${user.email}.${sent ? "" : " The email was NOT sent."}`,
    sent ? "done" : "failed",
  );

  return Response.json({ seat: { email, status: "invited", joined: false }, sent });
}
