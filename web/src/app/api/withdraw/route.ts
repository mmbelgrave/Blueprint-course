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

  const found = await findPurchase(admin, { userId: auth.user.id });
  if (!found) return Response.json({ signedIn: true, purchase: null, email: auth.user.email ?? "" });

  const { data: open } = await admin
    .from("withdrawals")
    .select("requested_at, access_ends_at, refund_deadline, status")
    .eq("entitlement_id", found.row.id)
    .eq("status", "received")
    .maybeSingle();

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
    already: open ?? null,
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
  const email = signedIn?.email ?? str(body.email, 200);
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
    .select("requested_at, access_ends_at, refund_deadline")
    .ilike("email", email)
    .eq("status", "received")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) {
    return Response.json({
      already: true,
      requestedAt: open.requested_at,
      accessEndsAt: open.access_ends_at,
      refundDeadline: open.refund_deadline,
      emailed: true,
    });
  }

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
  if ((mine.count ?? 0) >= PER_EMAIL_PER_DAY || (everyone.count ?? 0) >= EVERYONE_PER_TEN_MINUTES) {
    // Deliberately not "you have done this too often": the person on the other
    // end may be the victim of it rather than the cause.
    return fail(429, "We already have a request from that address. Please email info@maderealblueprint.com.");
  }

  const found = await findPurchase(admin, {
    userId: signedIn?.id,
    email: signedIn ? undefined : email,
    orderEntered,
  });

  const requestedAt = new Date();
  const deadline = refundDeadline(requestedAt);
  // Access only ends where there is access to end, and never for a purchase
  // that was already refunded or closed.
  const endsAt = found && found.row.status === "active" ? accessEndsAt(requestedAt) : null;
  const where = windowFor(found?.row.created_at ?? requestedAt);

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
          promise: refundPromise(where),
        }
      : {}),
  });
}
