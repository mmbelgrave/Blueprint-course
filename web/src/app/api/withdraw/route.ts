/*
 * Withdrawing from the contract (Terms §9, legal review of 18 October part 2).
 *
 * Two ways in, one handler. Somebody signed in presses the button in Settings
 * and we know who they are. Somebody who cannot sign in, which is exactly the
 * person most likely to want their money back, uses the public page and gives
 * their email address. Both end in the same row, the same two emails and the
 * same three days.
 *
 * The rule that shapes this file: **the request is always accepted.** A
 * mistyped order number, no order number, an address that matches nothing, a
 * purchase from last year — none of it is a reason to refuse a withdrawal,
 * because the law cares about the person's declaration and not about our
 * ability to find it in a database. So the row is written first and matched
 * afterwards, and anything we could not match is listed for Mwata to do by
 * hand.
 *
 * What stops this being an open mailbox is rate limiting, not a CAPTCHA: one
 * open request per address, five a day per address, and a ceiling for everyone
 * together.
 *
 * The screen a stranger sees never says whether the address matched a
 * purchase. That answer goes in the email, which only the owner of the address
 * can read.
 *
 * The money is refunded by hand in Lemon Squeezy, so the app never holds a
 * payment key.
 */
import { findAccountByEmail } from "@/lib/find-account";
import { sendMail } from "@/lib/send-mail";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";
import {
  accessEndsAt,
  provesOwnership,
  refundDeadline,
  refundPromise,
  windowFor,
  withdrawalMail,
  withdrawalNotice,
  type Receipt,
} from "@/lib/withdrawal";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });
const SUPPORT = process.env.SUPPORT_EMAIL_TO ?? "info@maderealblueprint.com";

/** Five a day from one address, and thirty in ten minutes from everybody. */
const PER_EMAIL_PER_DAY = 5;
const EVERYONE_PER_TEN_MINUTES = 30;

type Admin = NonNullable<ReturnType<typeof supabaseAdmin>>;

type Row = {
  id: number;
  user_id: string | null;
  product: string;
  status: string;
  order_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  created_at: string;
  ended_at: string | null;
};

const FIELDS = "id, user_id, product, status, order_id, amount_cents, currency, created_at, ended_at";
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

/**
 * The purchase this request is probably about.
 *
 * By account, because the email address is the one thing we can rely on. The
 * order number they typed only chooses between several purchases; it is never
 * what proves anything, and a wrong one is ignored rather than fatal.
 */
async function findPurchase(
  admin: Admin,
  who: { userId?: string; email?: string; orderEntered?: string | null },
): Promise<{ row: Row; userId: string } | null> {
  const userId = who.userId ?? (who.email ? await findAccountByEmail(admin, who.email).catch(() => null) : null);
  if (!userId) return null;
  const { data } = await admin
    .from("entitlements")
    .select(FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;
  const typed = who.orderEntered?.trim();
  const row =
    (typed ? rows.find((r) => r.order_id === typed) : undefined) ??
    rows.find((r) => r.status === "active") ??
    rows[0];
  return { row, userId };
}

export async function GET() {
  const admin = supabaseAdmin();
  if (!admin) return fail(503, "That is not set up yet.");

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ signedIn: false });

  /*
   * Both questions at once. Asking about withdrawals by person rather than by
   * purchase is what makes that possible, and the open row is matched to the
   * purchase here instead.
   */
  const [found, open] = await Promise.all([
    findPurchase(admin, { userId: auth.user.id }),
    admin
      .from("withdrawals")
      .select("entitlement_id, requested_at, access_ends_at, refund_deadline, status")
      .eq("user_id", auth.user.id)
      .eq("status", "received")
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data),
  ]);
  if (!found) return Response.json({ signedIn: true, purchase: null, email: auth.user.email ?? "" });

  const mine = open && open.entitlement_id === found.row.id ? open : null;
  const where = windowFor(found.row.created_at);
  return Response.json({
    signedIn: true,
    email: auth.user.email ?? "",
    purchase: {
      orderId: found.row.order_id,
      product: found.row.product,
      amountCents: found.row.amount_cents,
      currency: found.row.currency,
      boughtAt: found.row.created_at,
      window: where,
      refunded: found.row.status === "refunded",
    },
    promise: refundPromise(where),
    already: mine,
  });
}

export async function POST(request: Request) {
  const admin = supabaseAdmin();
  if (!admin) return fail(503, "That is not set up yet.");

  let body: { email?: unknown; order?: unknown; name?: unknown; timeZone?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "That request could not be read.");
  }

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const signedIn = auth.user;

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  /*
   * The address they typed wins over the one they happen to be signed in with.
   *
   * Found on the first real use of this page: somebody signed in on an account
   * with no purchase, filled in the address they had paid with, and the app
   * threw it away, looked up the signed-in account instead, found nothing, and
   * sent the confirmation to the wrong address. Somebody who paid with one
   * address and signed in with another is an ordinary case, not a mistake.
   */
  const typed = str(body.email, 200);
  const email = looksLikeEmail(typed) ? typed : (signedIn?.email ?? "");
  const orderEntered = str(body.order, 100) || null;
  const name = str(body.name, 120) || null;
  const timeZone = str(body.timeZone, 60) || null;

  if (!email || !looksLikeEmail(email)) {
    return fail(400, "Please write the email address you paid with, so we can send you the confirmation.");
  }

  /*
   * Pressing the button twice is one withdrawal, not two. This also means an
   * address that already has an open request cannot be used to send itself
   * letters.
   */
  const { data: open } = await admin
    .from("withdrawals")
    .select("id, requested_at, access_ends_at, refund_deadline")
    .ilike("email", email)
    .eq("status", "received")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const [mine, everyone] = await Promise.all([
    admin
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)
      .gte("requested_at", dayAgo),
    admin
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .gte("requested_at", tenMinutesAgo),
  ]);
  /*
   * The global ceiling is there to stop the page being used as a mailbox by
   * somebody else. It must not stand between a person and their own 14 days
   * (review round 7, attack 2): a signed-in person asking about their own
   * address is not the flood, so the ceiling does not apply to them. Their
   * own daily limit still does.
   */
  const ownRequest = Boolean(signedIn && (!typed || typed.toLowerCase() === (signedIn.email ?? "").toLowerCase()));
  const flooded = !ownRequest && (everyone.count ?? 0) >= EVERYONE_PER_TEN_MINUTES;
  if ((mine.count ?? 0) >= PER_EMAIL_PER_DAY || flooded) {
    // Deliberately not "you have done this too often": the person on the other
    // end may be the victim of it rather than the cause.
    return fail(429, "We already have a request from that address. Please email info@maderealblueprint.com.");
  }

  /*
   * We look up the purchase behind the address we are about to write to, and
   * never behind a different one. Typing an address means "this purchase";
   * the signed-in account is only used when they typed nothing, which is the
   * button in Settings.
   */
  const found = typed
    ? await findPurchase(admin, { email, orderEntered })
    : await findPurchase(admin, { userId: signedIn?.id, orderEntered });

  /*
   * Who is asking (review round 7, R7-1).
   *
   * Anybody may type anybody's address into the public page. Recording that
   * is right: the law cares about the declaration, and the person who owns
   * the address gets the letter either way. Acting on it is not. An
   * unverified request used to write `ended_at` on somebody else's purchase,
   * which took their course away three days later and, thirty days after
   * that, had the sweep delete their account.
   *
   * So a request ends access only when it came from the person whose purchase
   * it is: signed in on that account, or carrying the order number from their
   * own receipt. Everything else is recorded, answered and left for Mwata,
   * who has the list and the two emails.
   */
  const verified = provesOwnership({
    sessionUserId: signedIn?.id,
    ownerId: found?.userId,
    orderEntered,
    orderId: found?.row.order_id,
  });

  const requestedAt = new Date();
  const deadline = refundDeadline(requestedAt);
  // Access only ends where there is access to end, for a purchase that is
  // still open, and only on a request we can tie to its owner.
  const endsAt = verified && found && found.row.status === "active" ? accessEndsAt(requestedAt) : null;
  const where = windowFor(found?.row.created_at ?? requestedAt);

  if (open) {
    /*
     * One open request per address stands. What a later request may still do
     * is prove itself: somebody who asked from the public page and then
     * signed in, or came back with their order number, finishes the job on
     * the row that is already there rather than being told "we have it" while
     * nothing happens.
     */
    if (verified && !open.access_ends_at && found) {
      await admin
        .from("withdrawals")
        .update({
          matched_order_id: found.row.order_id,
          user_id: found.userId,
          entitlement_id: found.row.id,
          product: found.row.product,
          amount_cents: found.row.amount_cents,
          currency: found.row.currency,
          access_ends_at: endsAt?.toISOString() ?? null,
          note: "Proved by the person themselves on a later request.",
        })
        .eq("id", open.id);
      if (endsAt) {
        await admin.from("entitlements").update({ ended_at: endsAt.toISOString() }).eq("id", found.row.id);
      }
      const letter: Receipt = {
        email,
        name,
        orderEntered,
        matchedOrder: found.row.order_id,
        product: found.row.product,
        amountCents: found.row.amount_cents,
        currency: found.row.currency,
        requestedAt: open.requested_at,
        timeZone,
        endsAt,
        window: windowFor(found.row.created_at),
      };
      const told = await sendMail(email, withdrawalMail(letter));
      await sendMail(SUPPORT, withdrawalNotice(letter));
      return Response.json({
        already: true,
        requestedAt: open.requested_at,
        emailed: told,
        ...(signedIn ? { accessEndsAt: endsAt?.toISOString() ?? null, refundDeadline: open.refund_deadline } : {}),
      });
    }

    // Otherwise: the same neutral answer as a first request, so that pressing
    // the button twice tells a stranger nothing a first press would not.
    return Response.json({
      already: true,
      requestedAt: open.requested_at,
      emailed: true,
      ...(signedIn ? { accessEndsAt: open.access_ends_at, refundDeadline: open.refund_deadline } : {}),
    });
  }

  const { error: saved } = await admin.from("withdrawals").insert({
    email,
    name,
    order_entered: orderEntered,
    matched_order_id: found?.row.order_id ?? null,
    user_id: found?.userId ?? null,
    entitlement_id: found?.row.id ?? null,
    product: found?.row.product ?? null,
    amount_cents: found?.row.amount_cents ?? null,
    currency: found?.row.currency ?? null,
    requested_at: requestedAt.toISOString(),
    time_zone: timeZone,
    refund_deadline: deadline.toISOString(),
    access_ends_at: endsAt?.toISOString() ?? null,
    source: signedIn ? "app" : "public",
    note: verified ? null : "Not proved: no sign-in and no matching order number. Access was not ended.",
  });
  if (saved) return fail(500, "That could not be saved. Please email info@maderealblueprint.com.");

  /*
   * Access ends on the entitlement itself, three days out. The access rules
   * already refuse a purchase whose end has passed, so nothing has to run on
   * time for this to take effect; the daily sweep only tidies up afterwards.
   */
  if (found && endsAt) {
    await admin.from("entitlements").update({ ended_at: endsAt.toISOString() }).eq("id", found.row.id);
  }

  const receipt: Receipt = {
    email,
    name,
    orderEntered,
    matchedOrder: found?.row.order_id ?? null,
    product: found?.row.product ?? null,
    amountCents: found?.row.amount_cents ?? null,
    currency: found?.row.currency ?? null,
    requestedAt,
    timeZone,
    endsAt,
    window: where,
  };

  const sent = await sendMail(email, withdrawalMail(receipt));
  await sendMail(SUPPORT, withdrawalNotice(receipt));

  await admin
    .from("webhook_events")
    .insert({
      source: "withdrawal",
      event: "withdrawal_requested",
      email,
      order_id: found?.row.order_id ?? null,
      outcome: sent ? "done" : "failed",
      detail: `Full refund due by ${deadline.toISOString().slice(0, 10)}.${
        endsAt ? ` Access ends ${endsAt.toISOString().slice(0, 10)}.` : " Nothing matched: match it by hand."
      }${sent ? "" : " The email was NOT sent."}`,
    })
    .then(() => undefined, () => undefined);

  /*
   * What goes back to the screen. For a stranger this says nothing about
   * whether the address matched a purchase: that belongs in the email, which
   * only the owner of the address can read.
   */
  return Response.json({
    requestedAt: requestedAt.toISOString(),
    timeZone: timeZone,
    refundDeadline: deadline.toISOString(),
    emailed: sent,
    ...(signedIn
      ? {
          accessEndsAt: endsAt?.toISOString() ?? null,
          amountCents: found?.row.amount_cents ?? null,
          currency: found?.row.currency ?? null,
          // Only when we know which purchase this is about.
          promise: found ? refundPromise(where) : undefined,
        }
      : {}),
  });
}
