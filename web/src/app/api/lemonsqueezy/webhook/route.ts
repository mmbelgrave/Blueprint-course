/*
 * Lemon Squeezy tells us somebody bought (spec §6.1).
 *
 * Lemon Squeezy is the seller of record: the money, the invoice and the tax
 * are theirs. This is the only place the app learns that a payment happened,
 * so it has to be careful in three ways:
 *
 *   1. It must really be them — the body is signed, and we check the signature
 *      against the raw bytes before we read a single field.
 *   2. The same order must never count twice. Lemon Squeezy retries, and a
 *      unique index on the order id is what actually enforces it.
 *   3. Whatever happens, it must be visible. Every message is written to
 *      webhook_events, including the ones that did nothing and the ones that
 *      failed, because a payment that quietly opens nothing is the worst way
 *      for Mwata to find out.
 *
 * The answer to Lemon Squeezy is 200 unless we genuinely could not do our job.
 * A message we decided to ignore is not a failure, and asking them to retry it
 * forever helps nobody.
 */
import {
  decideAccess,
  purchaseMail,
  readOrder,
  verifySignature,
  type Mode,
  type Order,
} from "@/lib/lemonsqueezy";
import { termsFor, termsUrl } from "@/lib/terms-versions";
import { findAccountByEmail } from "@/lib/find-account";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maderealblueprint.com";
const FROM = `The Made Real Blueprint <${process.env.SUPPORT_EMAIL_FROM ?? "info@maderealblueprint.com"}>`;

type Outcome = "opened" | "closed" | "ignored" | "failed";

export async function POST(request: Request) {
  // The bytes as they arrived. Parsing first and re-serialising would change
  // the whitespace, and the signature would never match again.
  const raw = await request.text();

  const signedWith = verifySignature(raw, request.headers.get("x-signature"), {
    live: process.env.LS_WEBHOOK_SECRET_LIVE,
    test: process.env.LS_WEBHOOK_SECRET_TEST,
  });
  if (!signedWith) {
    // Nothing is written: an unsigned request is not evidence of anything, and
    // a log anyone can fill is not a log.
    console.error("lemonsqueezy: a request arrived without a signature we recognise");
    return Response.json({ error: "No." }, { status: 401 });
  }

  const admin = supabaseAdmin();
  if (!admin) {
    console.error("lemonsqueezy: no service key, so nothing can be written");
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const log = async (o: Outcome, detail: string, order?: Order) => {
    await admin.from("webhook_events").insert({
      event: order?.event ?? "unknown",
      order_id: order?.orderId ?? null,
      email: order?.email ?? null,
      test_mode: order?.testMode ?? signedWith === "test",
      outcome: o,
      detail,
    });
  };

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    await log("failed", "The body was not JSON.");
    return Response.json({ error: "Unreadable." }, { status: 400 });
  }

  const read = readOrder(body);
  if ("error" in read) {
    await log("failed", read.error);
    return Response.json({ error: read.error }, { status: 400 });
  }
  const order = read.order;

  const decision = decideAccess(order, signedWith as Mode, {
    variants: { phase1: process.env.LS_PHASE1_IDS, full: process.env.LS_FULL_IDS },
    allowTestOrders: process.env.ALLOW_TEST_ORDERS === "true",
  });

  if (decision.act === "ignore") {
    await log("ignored", decision.because, order);
    return Response.json({ ok: true, ignored: decision.because });
  }

  try {
    if (decision.act === "close") {
      const { data: ended, error } = await admin
        .from("entitlements")
        .update({ status: "refunded", ended_at: new Date().toISOString() })
        .eq("order_id", order.orderId)
        .select("user_id");
      if (error) throw new Error(error.message);
      /*
       * And the seat that came with it (spec §6.8, review round 6 R6-2).
       * Access already follows the buyer, so the partner is locked out either
       * way, but a seat row left standing means that address still counts as
       * "in a household" and cannot be invited anywhere else.
       */
      /*
       * An open withdrawal is now finished: the money has gone back. Matched
       * by order, so a refund closes the request it actually paid for.
       */
      await admin
        .from("withdrawals")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("matched_order_id", order.orderId)
        .eq("status", "received")
        .then(() => undefined, () => undefined);

      const seatsEnded: string[] = [];
      // A purchase whose account was deleted keeps the row but loses the
      // person, and there is no seat left to end.
      for (const row of ((ended ?? []) as { user_id: string | null }[]).filter((r) => r.user_id)) {
        const { data: seat } = await admin
          .from("partner_seats")
          .update({ status: "ended", ended_at: new Date().toISOString(), ended_reason: "refund" })
          .eq("buyer_id", row.user_id)
          .neq("status", "ended")
          .select("email");
        for (const s of (seat ?? []) as { email: string }[]) seatsEnded.push(s.email);
      }
      await log(
        "closed",
        `Refunded: ${order.reference}.${seatsEnded.length ? ` Partner seat ended for ${seatsEnded.join(", ")}.` : ""}`,
        order,
      );
      return Response.json({ ok: true });
    }

    const { userId, isNew } = await findOrCreateAccount(admin, order);

    const { error } = await admin.from("entitlements").insert({
      user_id: userId,
      product: decision.product,
      status: "active",
      source: "lemonsqueezy",
      order_id: order.orderId,
      variant_id: order.variantId,
      amount_cents: order.totalCents,
      currency: order.currency,
      test_mode: order.testMode,
      note: order.reference,
    });

    // 23505 is the unique index on order_id doing its job: Lemon Squeezy has
    // sent this one before and it is already open. Nothing to put right.
    if (error && error.code !== "23505") throw new Error(error.message);
    if (error) {
      await log("ignored", `Already open: ${order.reference}.`, order);
      return Response.json({ ok: true, ignored: "seen before" });
    }

    /*
     * A partner who has just bought their own copy. The seat is not ended
     * here — that is the buyer's seat, not ours to take away in the middle of
     * a webhook — but it is written down where Mwata reads it.
     */
    const { data: seats } = await admin
      .from("partner_seats")
      .select("buyer_id")
      .eq("partner_id", userId)
      .eq("status", "active");
    if ((seats ?? []).length > 0) {
      await log(
        "opened",
        `${order.email} was a partner on somebody else's seat and has now bought their own. Their answers are still in that household: end the seat if they want their own.`,
        order,
      );
    }

    const confirmation = await sendConfirmation(order);
    await log(
      "opened",
      `${decision.product} for ${order.email}${isNew ? ", new account" : ""}. ${
        confirmation.sent
          ? `Confirmation sent${confirmation.attached ? ` with the terms of ${confirmation.version}` : " WITHOUT the terms"}.`
          : "The confirmation was NOT sent."
      }`,
      order,
    );
    return Response.json({ ok: true });
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.error("lemonsqueezy: could not finish", why);
    await log("failed", why, order);
    // A 500 asks Lemon Squeezy to try again, which is what we want: this is
    // our fault, not theirs, and the next attempt may well work.
    return Response.json({ error: "We could not record that order." }, { status: 500 });
  }
}

/**
 * The account for this buyer.
 *
 * Somebody who already has an account — a founding member who signed up free,
 * or who bought Phase 1 and comes back for the rest — keeps it, and everything
 * they have already written. Only a genuinely new address gets a new account,
 * already confirmed, because they have proved the address by paying from it.
 *
 * No password is set and no invitation is sent: signing in is a code they ask
 * for themselves (§3.1).
 */
async function findOrCreateAccount(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  order: Order,
): Promise<{ userId: string; isNew: boolean }> {
  const existing = await findAccountByEmail(admin, order.email);
  if (existing) return { userId: existing, isNew: false };

  const { data, error } = await admin.auth.admin.createUser({
    email: order.email,
    email_confirm: true,
    user_metadata: order.name ? { first_name: order.name.split(" ")[0] } : {},
  });

  // Two webhooks for the same new buyer can race each other; the loser is told
  // the address is taken, and simply looks it up again.
  if (error) {
    const again = await findAccountByEmail(admin, order.email);
    if (again) return { userId: again, isNew: false };
    throw new Error(`Could not make an account for ${order.email}: ${error.message}`);
  }
  if (!data.user) throw new Error(`No account came back for ${order.email}.`);
  return { userId: data.user.id, isNew: true };
}


/**
 * The confirmation, with the terms of the day attached (lawyer, 24 October).
 *
 * The attachment is fetched from the app's own address rather than read off
 * the disk: a file in public/ is served by the edge, not by the function, and
 * a confirmation that cannot find its PDF still has to go out. When the fetch
 * fails the letter is sent without it and says so, and the line in Admin says
 * so too, which is how anybody finds out.
 */
async function sendConfirmation(order: Order): Promise<{ sent: boolean; attached: boolean; version: string | null }> {
  const key = process.env.RESEND_API_KEY;
  const nothing = { sent: false, attached: false, version: null };
  if (!key) return nothing;

  const boughtAt = new Date();
  const terms = termsFor(boughtAt);
  let attachment: { filename: string; content: string } | null = null;
  if (terms) {
    try {
      const got = await fetch(termsUrl(APP_URL, terms));
      if (got.ok) {
        const bytes = Buffer.from(await got.arrayBuffer());
        attachment = {
          filename: `The Made Real Blueprint - terms ${terms.version}.pdf`,
          content: bytes.toString("base64"),
        };
      } else {
        console.error("terms pdf refused:", got.status, terms.file);
      }
    } catch (e) {
      console.error("terms pdf could not be fetched:", (e as Error).message);
    }
  }

  const { subject, text } = purchaseMail({
    name: order.name,
    orderRef: order.reference || order.orderId,
    boughtOn: boughtAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    paid:
      order.totalCents === null
        ? null
        : `${order.currency ?? "EUR"} ${(order.totalCents / 100).toFixed(2)} including VAT`,
    termsVersion: attachment ? terms?.version ?? null : null,
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [order.email],
        subject,
        text,
        ...(attachment ? { attachments: [attachment] } : {}),
      }),
    });
    if (!res.ok) {
      console.error("confirmation refused by Resend:", res.status, await res.text());
      return nothing;
    }
    return { sent: true, attached: Boolean(attachment), version: terms?.version ?? null };
  } catch (e) {
    console.error("confirmation could not be sent:", (e as Error).message);
    return nothing;
  }
}
