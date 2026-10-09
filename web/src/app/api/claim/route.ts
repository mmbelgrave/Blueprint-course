/*
 * Moving a purchase to the account somebody actually uses (spec §6.1).
 *
 * Two steps, both on this route:
 *   POST { email }         — send a code to the address they paid with
 *   POST { email, code }   — check it, and move the purchase across
 *
 * The answer to the first step is always the same sentence, whether or not
 * there is a purchase on that address. Otherwise this endpoint would tell
 * anyone, for any address, whether that person had bought the course.
 *
 * The move is a move. The purchase ends up on exactly one account, as it
 * always was, and the account that paid is left with nothing — which is what
 * makes it safe to offer at all.
 */
import {
  claimMail,
  claimUsable,
  codeMatches,
  expiresAt,
  hashCode,
  newCode,
} from "@/lib/claim";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const FROM = `The Made Real Blueprint <${process.env.SUPPORT_EMAIL_FROM ?? "info@maderealblueprint.com"}>`;

/** The one sentence step 1 always answers with. */
const SENT = "If there is a purchase on that address, a code is on its way to it.";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first, then come back here.");

  const admin = supabaseAdmin();
  if (!admin) return fail(503, "This cannot be done here yet.");

  let body: { email?: string; code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "We could not read that.");
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return fail(400, "Please write the email address you paid with.");

  const code = String(body.code ?? "").trim();
  return code ? move(admin, auth.user.id, email, code) : send(admin, auth.user.id, email, auth.user.email ?? "");
}

/* ───────────────────────────── step 1: the code ───────────────────────── */

async function send(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  userId: string,
  email: string,
  signedInAs: string,
) {
  if (email === signedInAs.toLowerCase()) {
    return fail(400, "That is the address you are signed in with. If the course is not open, write to Mwata and he will sort it out.");
  }

  const owner = await accountFor(admin, email);
  const moveable = owner ? await activeEntitlements(admin, owner) : [];

  // Only when there is really something to move is an email sent — but the
  // answer is the same either way, so this route cannot be used to find out
  // who has bought the course.
  if (moveable.length > 0) {
    const code = newCode();
    const { error } = await admin.from("purchase_claims").insert({
      email,
      code_hash: hashCode(code, email),
      user_id: userId,
      expires_at: expiresAt(),
    });
    if (error) return fail(500, "We could not send that code. Please try again.");

    const sent = await sendMail(email, claimMail({ code, signedInAs }));
    if (!sent) {
      console.error("claim: the code could not be emailed to", email);
      return fail(
        502,
        "We could not send the email just now. Please write to info@maderealblueprint.com and Mwata will open it by hand.",
      );
    }
  }

  return Response.json({ ok: true, message: SENT });
}

/* ──────────────────────────── step 2: the move ────────────────────────── */

async function move(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  userId: string,
  email: string,
  code: string,
) {
  const { data: rows } = await admin
    .from("purchase_claims")
    .select("id, code_hash, attempts, expires_at, used_at")
    .eq("user_id", userId)
    .eq("email", email)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0] ?? null;
  const usable = claimUsable(row);
  if (!usable.ok) return fail(400, usable.why);

  if (!codeMatches(code, row!.code_hash, email)) {
    await admin
      .from("purchase_claims")
      .update({ attempts: row!.attempts + 1 })
      .eq("id", row!.id);
    return fail(400, "That code is not right. Please check it and try again.");
  }

  const owner = await accountFor(admin, email);
  const moveable = owner ? await activeEntitlements(admin, owner) : [];
  if (!owner || moveable.length === 0) {
    // It was there when the code was asked for and is not now: a refund, or
    // Mwata moved it himself in the meantime.
    await admin.from("purchase_claims").update({ used_at: new Date().toISOString() }).eq("id", row!.id);
    return fail(409, "There is nothing to move on that address any more. Please write to Mwata.");
  }

  const { error } = await admin
    .from("entitlements")
    .update({ user_id: userId })
    .in("id", moveable)
    .eq("user_id", owner);
  if (error) return fail(500, "We could not move it. Please try again.");

  await admin.from("purchase_claims").update({ used_at: new Date().toISOString() }).eq("id", row!.id);
  await admin.from("webhook_events").insert({
    source: "claim",
    event: "purchase_moved",
    email,
    outcome: "opened",
    detail: `${moveable.length === 1 ? "A purchase" : `${moveable.length} purchases`} moved to the account signed in.`,
  });

  return Response.json({ ok: true, moved: moveable.length });
}

/* ──────────────────────────────── helpers ─────────────────────────────── */

/** The account that paid, if there is one. */
async function accountFor(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  return data.users.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
}

/** The ids of what that account still holds. A refund is not moveable. */
async function activeEntitlements(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  userId: string,
): Promise<number[]> {
  const { data } = await admin.from("entitlements").select("id").eq("user_id", userId).eq("status", "active");
  return (data ?? []).map((r) => r.id as number);
}

async function sendMail(to: string, mail: { subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) {
      console.error("claim email refused by Resend:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("claim email could not be sent:", e);
    return false;
  }
}
