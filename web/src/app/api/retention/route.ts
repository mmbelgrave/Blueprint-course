/*
 * The quiet-account sweep (privacy note, "How long I keep your data").
 *
 * Runs once a day from vercel.json. For every account it asks lib/retention.ts
 * what to do, then does exactly that: write to somebody who has not signed in
 * for two years, delete them thirty days later if they still have not, and
 * tear up the notice the moment they come back.
 *
 * Three things make this safe to leave running:
 *
 *   1. It never deletes anybody within three years of a purchase. The terms
 *      promise that access, and a promise beats a cleanup.
 *   2. Nothing is deleted that was not written to first, and the writing is
 *      recorded in a table, so a deletion always has a dated warning behind it.
 *   3. Every account it touches is written to webhook_events, which Admin
 *      shows. A sweep that deletes quietly is the one nobody notices is wrong.
 *
 * `?dry=1` reports what it would do and changes nothing. Use that first.
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteEverything } from "@/lib/forget-account";
import { decide, quietMail, type Account } from "@/lib/retention";

export const runtime = "nodejs";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maderealblueprint.com";
const FROM = `The Made Real Blueprint <${process.env.SUPPORT_EMAIL_FROM ?? "info@maderealblueprint.com"}>`;
const PER_PAGE = 200;
const MAX_PAGES = 50;

export async function GET(request: Request) {
  /*
   * Vercel sends CRON_SECRET as a bearer token on its own schedule. Without
   * the check, anybody who found this address could start deleting accounts.
   */
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "No CRON_SECRET, so this cannot run." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No." }, { status: 401 });
  }

  const admin = supabaseAdmin();
  if (!admin) return Response.json({ error: "Not configured." }, { status: 503 });

  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const now = new Date();

  /* Everything we need, in three reads rather than one per account. */
  const users: { id: string; email: string; lastSeen: string | null; name?: string }[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) return Response.json({ error: "Could not read the accounts." }, { status: 500 });
    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email ?? "",
        lastSeen: u.last_sign_in_at ?? u.created_at ?? null,
        name: (u.user_metadata as { first_name?: string } | null)?.first_name,
      });
    }
    if (data.users.length < PER_PAGE) break;
  }

  const [{ data: bought }, { data: notices }] = await Promise.all([
    admin.from("entitlements").select("user_id, created_at").eq("status", "active"),
    admin.from("retention_notice").select("user_id, warned_at"),
  ]);

  const latestPurchase = new Map<string, string>();
  for (const row of bought ?? []) {
    const id = row.user_id as string;
    const when = row.created_at as string;
    if (!latestPurchase.has(id) || when > latestPurchase.get(id)!) latestPurchase.set(id, when);
  }
  const warnedOn = new Map((notices ?? []).map((n) => [n.user_id as string, n.warned_at as string]));

  const done = { checked: users.length, warned: 0, deleted: 0, forgotten: 0, failed: 0 };
  const detail: string[] = [];

  for (const u of users) {
    const account: Account = {
      id: u.id,
      email: u.email,
      lastSeen: u.lastSeen,
      boughtAt: latestPurchase.get(u.id) ?? null,
      warnedAt: warnedOn.get(u.id) ?? null,
    };
    const verdict = decide(account, now);
    if (verdict.act === "keep") continue;

    if (dry) {
      detail.push(`${verdict.act}: ${u.email}`);
      done[verdict.act === "warn" ? "warned" : verdict.act === "delete" ? "deleted" : "forgotten"] += 1;
      continue;
    }

    try {
      if (verdict.act === "forget") {
        await admin.from("retention_notice").delete().eq("user_id", u.id);
        done.forgotten += 1;
        continue;
      }

      if (verdict.act === "warn") {
        const sent = await sendMail(u.email, quietMail({ name: u.name, appUrl: APP_URL, email: u.email }));
        // The row is only written when the email really left. Writing it first
        // would start a 30-day clock on a letter nobody received.
        if (!sent) throw new Error("the email could not be sent");
        await admin.from("retention_notice").upsert({ user_id: u.id, email: u.email, warned_at: now.toISOString() });
        await log(admin, "quiet_account_warned", u.email, `No sign-in since ${verdict.quietSince}. 30 days to answer.`);
        done.warned += 1;
        continue;
      }

      await deleteEverything(admin, u.id);
      await log(admin, "quiet_account_deleted", u.email, `Written to on ${verdict.warnedOn}, no sign-in since.`);
      done.deleted += 1;
    } catch (e) {
      done.failed += 1;
      const why = e instanceof Error ? e.message : String(e);
      console.error("retention:", u.email, why);
      await log(admin, `quiet_account_${verdict.act}_failed`, u.email, why, "failed");
    }
  }

  return Response.json({ ok: true, dry, ...done, ...(dry ? { detail } : {}) });
}

async function log(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  event: string,
  email: string,
  detail: string,
  outcome = "opened",
) {
  await admin.from("webhook_events").insert({ source: "retention", event, email, outcome, detail });
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
      console.error("retention email refused by Resend:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("retention email could not be sent:", e);
    return false;
  }
}
