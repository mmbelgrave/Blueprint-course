/*
 * Withdrawing from the contract (Terms §9).
 *
 * Two ways in, one handler. Somebody signed in presses the button in Settings
 * and we know who they are. Somebody who cannot sign in, which is exactly the
 * person most likely to want their money back, uses the public page and gives
 * the order number and the address they paid with. Both end in the same row,
 * the same two emails and the same three working days.
 *
 * The money is refunded by hand in Lemon Squeezy, so the app never holds a
 * payment key. What this route guarantees is that the request is recorded with
 * its minute, that the buyer is told in writing, and that Mwata is told while
 * it still matters.
 *
 * GET says what the person is entitled to do, so the page can draw the right
 * thing without guessing.
 */
import { findAccountByEmail } from "@/lib/find-account";
import { sendMail } from "@/lib/send-mail";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";
import {
  accessEndsAt,
  mayWithdraw,
  sameEmail,
  windowFor,
  withdrawalMail,
  withdrawalNotice,
  type Order,
} from "@/lib/withdrawal";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });
const SUPPORT = process.env.SUPPORT_EMAIL_TO ?? "info@maderealblueprint.com";

type Row = {
  id: number;
  user_id: string;
  product: string;
  status: string;
  order_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  created_at: string;
  ended_at: string | null;
};

const asOrder = (row: Row, email: string | null): Order => ({
  orderId: row.order_id,
  email,
  product: row.product,
  status: row.status,
  amountCents: row.amount_cents,
  currency: row.currency,
  boughtAt: row.created_at,
});

/** The purchase this request is about, and the address that owns it. */
async function findPurchase(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  who: { userId?: string; orderId?: string; email?: string },
): Promise<{ row: Row; email: string } | null> {
  if (who.userId) {
    const { data } = await admin
      .from("entitlements")
      .select("id, user_id, product, status, order_id, amount_cents, currency, created_at, ended_at")
      .eq("user_id", who.userId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Row[];
    // The one they could still withdraw from, else the newest, so the page can
    // explain rather than say nothing.
    const row = rows.find((r) => r.status === "active") ?? rows[0];
    if (!row) return null;
    const { data: user } = await admin.auth.admin.getUserById(who.userId);
    return { row, email: user?.user?.email ?? "" };
  }

  if (!who.orderId || !who.email) return null;
  const userId = await findAccountByEmail(admin, who.email).catch(() => null);
  if (!userId) return null;
  const { data } = await admin
    .from("entitlements")
    .select("id, user_id, product, status, order_id, amount_cents, currency, created_at, ended_at")
    .eq("order_id", who.orderId.trim())
    .maybeSingle();
  const row = (data as Row | null) ?? null;
  // The order and the address have to belong together, or anybody with an
  // order number could end somebody else's access.
  if (!row || row.user_id !== userId) return null;
  return { row, email: who.email.trim() };
}

export async function GET() {
  const admin = supabaseAdmin();
  if (!admin) return fail(503, "That is not set up yet.");

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ signedIn: false });

  const found = await findPurchase(admin, { userId: auth.user.id });
  if (!found) return Response.json({ signedIn: true, purchase: null });

  const order = asOrder(found.row, found.email);
  const verdict = mayWithdraw(order);
  const { data: open } = await admin
    .from("withdrawal_requests")
    .select("requested_at, access_ends_at, status")
    .eq("entitlement_id", found.row.id)
    .eq("status", "requested")
    .maybeSingle();

  return Response.json({
    signedIn: true,
    purchase: {
      orderId: order.orderId,
      product: order.product,
      amountCents: order.amountCents,
      currency: order.currency,
      boughtAt: order.boughtAt,
      window: windowFor(order.boughtAt),
    },
    may: verdict.ok,
    why: verdict.ok ? null : verdict.why,
    already: open ?? null,
  });
}

export async function POST(request: Request) {
  const admin = supabaseAdmin();
  if (!admin) return fail(503, "That is not set up yet.");

  let body: { orderId?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return fail(400, "That request could not be read.");
  }

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const signedIn = auth.user;

  const found = signedIn
    ? await findPurchase(admin, { userId: signedIn.id })
    : await findPurchase(admin, { orderId: body.orderId, email: body.email });

  // The same sentence whether the order does not exist or the address does not
  // match it, so this cannot be used to find out who bought what.
  const order = found ? asOrder(found.row, found.email) : null;
  if (!signedIn && found && !sameEmail(found.email, body.email)) {
    return fail(404, mayWithdraw(null).ok === false ? (mayWithdraw(null) as { why: string }).why : "Not found.");
  }

  const verdict = mayWithdraw(order);
  if (!verdict.ok) return fail(order ? 409 : 404, verdict.why);
  if (!found) return fail(404, "We cannot find that order.");

  // Pressing the button twice is one request, not two.
  const { data: open } = await admin
    .from("withdrawal_requests")
    .select("requested_at, access_ends_at")
    .eq("entitlement_id", found.row.id)
    .eq("status", "requested")
    .maybeSingle();
  if (open) {
    return Response.json({ already: true, requestedAt: open.requested_at, accessEndsAt: open.access_ends_at });
  }

  const requestedAt = new Date();
  const endsAt = accessEndsAt(requestedAt);

  const { error: saved } = await admin.from("withdrawal_requests").insert({
    user_id: found.row.user_id,
    entitlement_id: found.row.id,
    order_id: found.row.order_id,
    email: found.email,
    amount_cents: found.row.amount_cents,
    currency: found.row.currency,
    requested_at: requestedAt.toISOString(),
    access_ends_at: endsAt.toISOString(),
    source: signedIn ? "app" : "public",
  });
  if (saved) return fail(500, "That could not be saved. Please email info@maderealblueprint.com.");

  /*
   * Access ends on the entitlement itself, three working days out. The access
   * rules already refuse a purchase whose end has passed, so nothing has to
   * run on time for this to take effect.
   */
  await admin.from("entitlements").update({ ended_at: endsAt.toISOString() }).eq("id", found.row.id);

  const letter = withdrawalMail({
    orderId: found.row.order_id,
    amountCents: found.row.amount_cents,
    currency: found.row.currency,
    requestedAt,
    endsAt,
  });
  const sent = await sendMail(found.email, letter);
  await sendMail(
    SUPPORT,
    withdrawalNotice({
      orderId: found.row.order_id,
      email: found.email,
      amountCents: found.row.amount_cents,
      currency: found.row.currency,
      endsAt,
    }),
  );

  await admin
    .from("webhook_events")
    .insert({
      source: "withdrawal",
      event: "withdrawal_requested",
      email: found.email,
      order_id: found.row.order_id,
      outcome: sent ? "done" : "failed",
      detail: `Full refund due. Access ends ${endsAt.toISOString().slice(0, 10)}.${sent ? "" : " The email was NOT sent."}`,
    })
    .then(() => undefined, () => undefined);

  return Response.json({
    requestedAt: requestedAt.toISOString(),
    accessEndsAt: endsAt.toISOString(),
    emailed: sent,
    amountCents: found.row.amount_cents,
    currency: found.row.currency,
  });
}
