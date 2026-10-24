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
import { counts, type Entitlement } from "@/lib/access";
import {
  aiOffSince,
  CONSENT_HISTORY_YEARS,
  expiredConsentIds,
  orphanedConsentIds,
  type ConsentRow,
} from "@/lib/consent";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { deleteEverything } from "@/lib/forget-account-server";
import {
  CHAT_MONTHS,
  decide,
  deletionDay,
  LOG_MONTHS,
  olderThan,
  quietMail,
  quietReminderMail,
  type Account,
} from "@/lib/retention";
import {
  asDay,
  deleteDay,
  endSeat,
  INVITATION_DAYS,
  PARTNER_ANSWERS,
  SEAT_DATA_DAYS,
  seatEndedMail,
  type Ending,
} from "@/lib/seat-end";
import { reminderMail, sweepActs, type OpenWithdrawal } from "@/lib/withdrawal";

export const runtime = "nodejs";
export const maxDuration = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.maderealblueprint.com";
const FROM = `The Made Real Blueprint <${process.env.SUPPORT_EMAIL_FROM ?? "info@maderealblueprint.com"}>`;
const SUPPORT = process.env.SUPPORT_EMAIL_TO ?? "info@maderealblueprint.com";
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

  const [{ data: bought }, warnings] = await Promise.all([
    admin.from("entitlements").select("user_id, created_at").eq("status", "active"),
    admin.from("retention_notice").select("user_id, warned_at, reminded_at"),
  ]);

  /*
   * The notices have to be readable, or nothing here may run.
   *
   * Without them every warned account looks unwarned and would be written to
   * again, which restarts a 30-day clock that was nearly up. The reminder
   * column arrived on 24 October, so a database where that migration has not
   * been run is the likely reason, and it is read again without it.
   */
  let notices = warnings.data as { user_id: string; warned_at: string; reminded_at?: string | null }[] | null;
  /* Without that column there is nowhere to write that a reminder was sent,
     so no reminder is sent: one letter a night is worse than none. */
  const mayRemind = !warnings.error;
  if (warnings.error) {
    console.error("retention: the notices could not be read:", warnings.error.message);
    const again = await admin.from("retention_notice").select("user_id, warned_at");
    if (again.error) {
      return Response.json({ error: "The retention notices could not be read, so nothing was done." }, { status: 503 });
    }
    notices = again.data as { user_id: string; warned_at: string }[];
  }

  const latestPurchase = new Map<string, string>();
  for (const row of bought ?? []) {
    const id = row.user_id as string;
    const when = row.created_at as string;
    if (!latestPurchase.has(id) || when > latestPurchase.get(id)!) latestPurchase.set(id, when);
  }
  const warnedOn = new Map((notices ?? []).map((n) => [n.user_id as string, n.warned_at as string]));
  const remindedOn = new Map(
    (notices ?? []).map((n) => [n.user_id as string, (n.reminded_at as string | null) ?? null]),
  );

  const done = { checked: users.length, warned: 0, reminded: 0, deleted: 0, forgotten: 0, failed: 0 };
  /** Which tally each verdict belongs to, so a new verdict cannot be lost. */
  const bucket = { warn: "warned", remind: "reminded", delete: "deleted", forget: "forgotten" } as const;
  const detail: string[] = [];

  for (const u of users) {
    const account: Account = {
      id: u.id,
      email: u.email,
      lastSeen: u.lastSeen,
      boughtAt: latestPurchase.get(u.id) ?? null,
      warnedAt: warnedOn.get(u.id) ?? null,
      remindedAt: remindedOn.get(u.id) ?? null,
    };
    const verdict = decide(account, now);
    if (verdict.act === "keep") continue;
    if (verdict.act === "remind" && !mayRemind) continue;

    if (dry) {
      detail.push(`${verdict.act}: ${u.email}`);
      done[bucket[verdict.act]] += 1;
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

      /*
       * The one reminder, seven days before the deletion (item B5). The
       * minute is written only when the letter left, so a failure is tried
       * again tomorrow rather than counted as sent.
       */
      if (verdict.act === "remind") {
        const goesOn = deletionDay(verdict.warnedOn);
        const sent = await sendMail(
          u.email,
          quietReminderMail({ name: u.name, appUrl: APP_URL, email: u.email, goesOn }),
        );
        if (!sent) throw new Error("the reminder could not be sent");
        await admin.from("retention_notice").update({ reminded_at: now.toISOString() }).eq("user_id", u.id);
        await log(admin, "quiet_account_reminded", u.email, `Seven days before the deletion on ${goesOn}.`);
        done.reminded += 1;
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

  const withdrawals = await sweepWithdrawals(admin, now, dry, detail);
  const consents = await sweepConsents(admin, now, dry, detail, new Set(users.map((u) => u.id)));
  const logs = await sweepLogs(admin, now, dry, detail);
  const chats = await sweepChats(admin, now, dry, detail);
  const seats = await sweepSeats(admin, now, dry, detail);

  return Response.json({
    ok: true,
    dry,
    ...done,
    withdrawals,
    consents,
    logs,
    chats,
    seats,
    ...(dry ? { detail } : {}),
  });
}

/**
 * The two logs the privacy note puts a year on.
 *
 * "The log of how much you used your AI partner is kept for 12 months, and
 * questions you send from Help for 12 months after we last spoke." Nothing
 * kept either promise until now: a question from the first week would have
 * sat there for as long as the account did.
 *
 * Both tables are swept whole rather than per person, because the promise is
 * about the row and not about who wrote it. Neither is anybody's work: the
 * usage log is a count of requests, and a question has already been answered
 * by email.
 */
async function sweepLogs(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  now: Date,
  dry: boolean,
  detail: string[],
) {
  const out = { deleted: 0, failed: 0 };
  const said: string[] = [];
  for (const table of ["usage_log", "questions"] as const) {
    const { data, error } = await admin.from(table).select("id, created_at");
    if (error) {
      console.error(`log sweep: could not read ${table}:`, error.message);
      continue;
    }
    const going = olderThan((data ?? []) as { id: number; created_at: string | null }[], LOG_MONTHS, now);
    said.push(`${table}: ${going.length} of ${(data ?? []).length}`);
    if (going.length === 0) continue;

    if (dry) {
      detail.push(`${table}: ${going.length} rows older than ${LOG_MONTHS} months would go`);
      out.deleted += going.length;
      continue;
    }

    const { error: gone } = await admin.from(table).delete().in("id", going);
    if (gone) {
      console.error(`log sweep: could not delete from ${table}:`, gone.message);
      said[said.length - 1] += " (could not delete)";
      out.failed += going.length;
      continue;
    }
    out.deleted += going.length;
  }

  /*
   * The line that says it ran. Zero is the usual answer and is worth writing
   * down: without it, "nothing was deleted" and "nothing happened" look the
   * same in Admin.
   */
  const what = said.length ? said.join(", ") : "nothing to read";
  if (dry) {
    detail.push(`logs: older than ${LOG_MONTHS} months, would delete: ${what}`);
  } else {
    await log(
      admin,
      "logs_swept",
      "",
      `Older than ${LOG_MONTHS} months, deleted: ${what}.`,
      out.failed ? "failed" : "opened",
    );
  }
  return out;
}

/**
 * The three jobs that follow a withdrawal (Terms §9, legal review part 2).
 *
 * Access has already stopped by itself: the access rules read `ended_at`, and
 * the withdrawal set it three days out. What is left is to make the rows say
 * so, to nudge Mwata if the money has not gone back by day seven, and to
 * delete the answers thirty days after access ended.
 *
 * Nothing here is allowed to throw the sweep over. A withdrawal that cannot be
 * tidied is written to webhook_events and the next one is tried.
 */
async function sweepWithdrawals(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  now: Date,
  dry: boolean,
  detail: string[],
) {
  const tally = { revoked: 0, reminded: 0, dataDeleted: 0, failed: 0 };
  const { data, error } = await admin
    .from("withdrawals")
    .select(
      "id, email, status, requested_at, access_ends_at, reminded_at, data_deleted_at, user_id, entitlement_id, matched_order_id, amount_cents, currency",
    )
    .neq("status", "cancelled");
  if (error) {
    // The table may not exist yet on a database where the migration has not
    // been run. The quiet-account sweep above has already done its work.
    console.error("withdrawal sweep: could not read withdrawals:", error.message);
    return tally;
  }

  for (const row of (data ?? []) as (OpenWithdrawal & {
    id: number;
    email: string;
    entitlement_id: number | null;
    matched_order_id: string | null;
    amount_cents: number | null;
    currency: string | null;
  })[]) {
    /*
      * A purchase that is open again, with no end date on it, is somebody who
      * changed their mind (R7-2). The sweep leaves it alone rather than
      * taking the access away a second time, whatever the withdrawal row
      * still says.
      */
    if (row.entitlement_id) {
      const { data: live } = await admin
        .from("entitlements")
        .select("status, ended_at")
        .eq("id", row.entitlement_id)
        .maybeSingle();
      if (live && live.status === "active" && !live.ended_at) {
        await admin
          .from("withdrawals")
          .update({ status: "cancelled", note: "The purchase is open again; the withdrawal was not carried out." })
          .eq("id", row.id);
        continue;
      }
    }

    const acts = sweepActs(row, now);
    if (acts.length === 0) continue;
    if (dry) {
      detail.push(`withdrawal ${row.email}: ${acts.join(", ")}`);
      continue;
    }

    try {
      if (acts.includes("remind")) {
        const sent = await sendMail(
          SUPPORT,
          reminderMail({
            email: row.email,
            matchedOrder: row.matched_order_id,
            amountCents: row.amount_cents,
            currency: row.currency,
            requestedAt: row.requested_at,
          }),
        );
        // Only written when the email left, so a failure is tried again
        // tomorrow rather than forgotten.
        if (sent) {
          await admin.from("withdrawals").update({ reminded_at: now.toISOString() }).eq("id", row.id);
          await log(admin, "withdrawal_refund_overdue", row.email, "Day seven and the refund has not arrived.");
          tally.reminded += 1;
        }
      }

      if (acts.includes("revoke") && row.entitlement_id) {
        const { data: closed } = await admin
          .from("entitlements")
          .update({ status: "revoked" })
          .eq("id", row.entitlement_id)
          .eq("status", "active")
          .select("id");
        if ((closed ?? []).length > 0) {
          await log(admin, "withdrawal_access_ended", row.email, "The three days are up.");
          tally.revoked += 1;
        }
      }

      if (acts.includes("delete-data") && row.user_id) {
        /*
         * Somebody who came back and bought again keeps everything. The
         * withdrawal is old news, and deleting their answers because of it
         * would be the worst bug in this file.
         */
        const { data: theirs } = await admin
          .from("entitlements")
          .select("product, status, ended_at")
          .eq("user_id", row.user_id);
        const stillIn = ((theirs ?? []) as Entitlement[]).some((e) => counts(e, now));
        if (stillIn) continue;
        await deleteEverything(admin, row.user_id);
        // The account is gone; the withdrawal row stays, and says when.
        await admin.from("withdrawals").update({ data_deleted_at: now.toISOString() }).eq("id", row.id);
        await log(admin, "withdrawal_data_deleted", row.email, "Thirty days after access ended.");
        tally.dataDeleted += 1;
      }
    } catch (e) {
      tally.failed += 1;
      const why = e instanceof Error ? e.message : String(e);
      console.error("withdrawal sweep:", row.email, why);
      await log(admin, "withdrawal_sweep_failed", row.email, why, "failed");
    }
  }

  return tally;
}

/**
 * Chats, and the chats and notes of somebody who switched the AI off (B3).
 *
 * Two promises in one sweep, because they are about the same two tables:
 *
 *   - A chat with the AI partner is kept for twelve months from the day it
 *     was written, then deleted, whoever wrote it.
 *   - Somebody who switches their AI partner off is asked whether to delete
 *     their chats and notes now or keep them switched off. If they keep them,
 *     both go twelve months after the AI partner went off. The notes are
 *     otherwise left alone: they stay until the person deletes them, or until
 *     the quiet-account routine above takes the whole account.
 */
async function sweepChats(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  now: Date,
  dry: boolean,
  detail: string[],
) {
  const out = { deleted: 0, notes: 0, failed: 0 };
  const said: string[] = [];

  /* Old chats, line by line. */
  const { data, error } = await admin.from("conversations").select("id, created_at");
  if (error) {
    console.error("chat sweep: could not read conversations:", error.message);
    said.push("chats: could not be read");
  } else {
    const going = olderThan((data ?? []) as { id: number; created_at: string | null }[], CHAT_MONTHS, now);
    said.push(`chats: ${going.length} of ${(data ?? []).length}`);
    if (going.length > 0) {
      if (dry) {
        out.deleted += going.length;
      } else {
        const { error: gone } = await admin.from("conversations").delete().in("id", going);
        if (gone) {
          console.error("chat sweep: could not delete chats:", gone.message);
          said[said.length - 1] += " (could not delete)";
          out.failed += going.length;
        } else {
          out.deleted += going.length;
        }
      }
    }
  }

  /*
   * The people who switched the AI partner off and kept what it had made.
   * Twelve months later both go. Somebody who switched it on again has no
   * "off" minute any more and is left alone.
   */
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - CHAT_MONTHS);
  const { data: rows, error: consentError } = await admin
    .from("consents")
    .select("user_id, kind, granted, wording_version, recorded_at");
  if (consentError) {
    console.error("chat sweep: could not read consents:", consentError.message);
    said.push("switched off: could not be read");
  } else {
    const byUser = new Map<string, ConsentRow[]>();
    for (const row of (rows ?? []) as (ConsentRow & { user_id: string })[]) {
      const mine = byUser.get(row.user_id) ?? [];
      mine.push(row);
      byUser.set(row.user_id, mine);
    }
    const longOff: string[] = [];
    for (const [userId, mine] of byUser) {
      const off = aiOffSince(mine);
      if (off && new Date(off).getTime() <= cutoff.getTime()) longOff.push(userId);
    }
    said.push(`switched off over ${CHAT_MONTHS} months ago: ${longOff.length}`);
    for (const userId of longOff) {
      if (dry) {
        out.notes += 1;
        continue;
      }
      const first = await admin.from("conversations").delete().eq("user_id", userId);
      const second = await admin.from("ai_profile").delete().eq("user_id", userId);
      if (first.error || second.error) {
        out.failed += 1;
        continue;
      }
      out.notes += 1;
    }
  }

  const what = said.join(", ");
  if (dry) {
    detail.push(`chats: older than ${CHAT_MONTHS} months, would delete: ${what}`);
  } else {
    await log(
      admin,
      "chats_swept",
      "",
      `Older than ${CHAT_MONTHS} months, deleted: ${what}.`,
      out.failed ? "failed" : "opened",
    );
  }
  return out;
}

/**
 * The partner seat: invitations nobody used, and seats whose purchase has
 * gone (items B4b and B4d).
 *
 * Three jobs, in order:
 *
 *   1. An invitation that has stood for thirty days is thrown away, and with
 *      it the only thing it held: an email address. The account that was made
 *      in advance goes too, if nobody ever signed in to it.
 *   2. A seat whose buyer no longer has access is ended. That normally
 *      happens at the moment of the refund or the withdrawal; this is the net
 *      underneath, for an entitlement that simply ran out.
 *   3. For every ending: the partner is written to at once, with the date and
 *      how to download their answers, and thirty days later their own answers
 *      are deleted. The shared answers are the buyer's rows and stay where
 *      they are.
 */
async function sweepSeats(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  now: Date,
  dry: boolean,
  detail: string[],
) {
  const out = { expired: 0, ended: 0, told: 0, dataDeleted: 0, failed: 0 };

  const { data: seats, error } = await admin
    .from("partner_seats")
    .select("buyer_id, email, partner_id, status, invited_at, joined_at")
    .neq("status", "ended");
  if (error) console.error("seat sweep: could not read seats:", error.message);

  const old = new Date(now);
  old.setDate(old.getDate() - INVITATION_DAYS);

  for (const seat of (seats ?? []) as {
    buyer_id: string;
    email: string;
    partner_id: string | null;
    status: string;
    invited_at: string | null;
    joined_at: string | null;
  }[]) {
    try {
      /* 1. An invitation nobody used. */
      if (seat.status === "invited" && seat.invited_at && new Date(seat.invited_at).getTime() <= old.getTime()) {
        if (dry) {
          detail.push(`invitation to ${seat.email} would expire`);
          out.expired += 1;
          continue;
        }
        await admin.from("partner_seats").delete().eq("buyer_id", seat.buyer_id);
        /*
         * The account made in advance, when it was only ever made for this
         * invitation: never signed in, nothing written, nothing bought, and
         * made no earlier than the invitation itself.
         */
        if (seat.partner_id) {
          const { data: who } = await admin.auth.admin.getUserById(seat.partner_id);
          const account = who?.user;
          const madeForThis =
            account &&
            !account.last_sign_in_at &&
            new Date(account.created_at).getTime() >= new Date(seat.invited_at).getTime() - 60_000;
          if (madeForThis) {
            const [{ data: profile }, { data: bought }] = await Promise.all([
              admin.from("profiles").select("user_id").eq("user_id", seat.partner_id).maybeSingle(),
              admin.from("entitlements").select("id").eq("user_id", seat.partner_id).limit(1),
            ]);
            if (!profile && (bought ?? []).length === 0) {
              await admin.auth.admin.deleteUser(seat.partner_id).catch(() => undefined);
            }
          }
        }
        await log(admin, "seat_invitation_expired", seat.email, `Not used within ${INVITATION_DAYS} days.`);
        out.expired += 1;
        continue;
      }

      /* 2. A seat whose purchase has gone. */
      const { data: theirs } = await admin
        .from("entitlements")
        .select("product, status, ended_at")
        .eq("user_id", seat.buyer_id);
      const buyerIsIn = ((theirs ?? []) as Entitlement[]).some((e) => counts(e, now));
      if (!buyerIsIn) {
        if (dry) {
          detail.push(`seat with ${seat.email} would end: the purchase has gone`);
          out.ended += 1;
          continue;
        }
        await endSeat(admin, seat, "access_ended");
        await log(admin, "seat_ended", seat.email, "The buyer no longer has access.");
        out.ended += 1;
      }
    } catch (e) {
      out.failed += 1;
      console.error("seat sweep:", seat.email, e instanceof Error ? e.message : String(e));
    }
  }

  /* 3. Every ending that is not finished with. */
  const { data: endings, error: endingError } = await admin
    .from("partner_endings")
    .select("id, partner_id, email, ended_at, notified_at, data_deleted_at")
    .is("data_deleted_at", null);
  if (endingError) {
    // The table may not exist yet on a database where the migration has not
    // been run. Everything above has already done its work.
    console.error("seat sweep: could not read endings:", endingError.message);
    return out;
  }

  for (const ending of (endings ?? []) as Ending[]) {
    const goes = deleteDay(ending.ended_at);
    try {
      if (!ending.notified_at) {
        if (dry) {
          detail.push(`${ending.email} would be told their seat ended`);
          out.told += 1;
        } else {
          const sent = await sendMail(
            ending.email,
            seatEndedMail({
              appUrl: APP_URL,
              email: ending.email,
              endedOn: asDay(ending.ended_at),
              deleteOn: asDay(goes),
            }),
          );
          if (sent) {
            await admin.from("partner_endings").update({ notified_at: now.toISOString() }).eq("id", ending.id);
            await log(admin, "seat_partner_told", ending.email, `The seat ended on ${asDay(ending.ended_at)}.`);
            out.told += 1;
          }
        }
      }

      if (goes.getTime() <= now.getTime()) {
        if (dry) {
          detail.push(`${ending.email}: their own answers would be deleted`);
          out.dataDeleted += 1;
          continue;
        }
        /*
         * Their own writing only. The shared answers live on the buyer's
         * rows and are not this person's to take away, and their account
         * stays: they may be using it for something else.
         */
        for (const table of PARTNER_ANSWERS) {
          const { error: gone } = await admin.from(table).delete().eq("user_id", ending.partner_id);
          if (gone) throw new Error(`${table}: ${gone.message}`);
        }
        await admin.from("partner_endings").update({ data_deleted_at: now.toISOString() }).eq("id", ending.id);
        await log(admin, "seat_partner_answers_deleted", ending.email, `${SEAT_DATA_DAYS} days after the seat ended.`);
        out.dataDeleted += 1;
      }
    } catch (e) {
      out.failed += 1;
      const why = e instanceof Error ? e.message : String(e);
      console.error("seat sweep:", ending.email, why);
      await log(admin, "seat_sweep_failed", ending.email, why, "failed");
    }
  }

  return out;
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

/**
 * Consent history, three years after a consent ended.
 *
 * What stays is the row that says what is allowed today. What goes is the
 * trail behind it: a tick from four years ago that was switched off three
 * years ago has done its job, and keeping it is keeping personal data for no
 * reason anybody could give.
 *
 * The table refuses an update, so this is the only hand that ever changes it,
 * and it only ever removes whole rows.
 */
async function sweepConsents(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  now: Date,
  dry: boolean,
  detail: string[],
  /** Everybody who still has an account, so the rest are records of nobody. */
  stillHere: Set<string>,
) {
  const { data, error } = await admin.from("consents").select("id, user_id, kind, granted, wording_version, recorded_at");
  if (error) {
    console.error("consent sweep: could not read consents:", error.message);
    return { deleted: 0, failed: 0 };
  }

  const rows = (data ?? []) as (ConsentRow & { id: number; user_id: string })[];
  const byUser = new Map<string, (ConsentRow & { id: number; user_id: string })[]>();
  for (const row of rows) {
    const mine = byUser.get(row.user_id) ?? [];
    mine.push(row);
    byUser.set(row.user_id, mine);
  }

  const going: number[] = [];
  let orphans = 0;
  for (const [userId, mine] of byUser) {
    /*
     * A deleted account leaves its records behind on purpose since 24 October.
     * They go three years after the last of them, all together.
     */
    if (!stillHere.has(userId)) {
      const old = orphanedConsentIds(mine, now);
      going.push(...old);
      orphans += old.length;
      continue;
    }
    going.push(...expiredConsentIds(mine, now));
  }
  if (going.length === 0) return { deleted: 0, failed: 0 };

  if (dry) {
    detail.push(
      `consents: ${going.length} rows older than ${CONSENT_HISTORY_YEARS} years would go` +
        (orphans ? `, ${orphans} of them from accounts that are gone` : ""),
    );
    return { deleted: going.length, failed: 0 };
  }

  const { error: gone } = await admin.from("consents").delete().in("id", going);
  if (gone) {
    console.error("consent sweep: could not delete:", gone.message);
    await log(admin, "consent_history_failed", "", gone.message, "failed");
    return { deleted: 0, failed: going.length };
  }
  await log(
    admin,
    "consent_history_deleted",
    "",
    `${going.length} consent rows, ended over ${CONSENT_HISTORY_YEARS} years ago` +
      (orphans ? `, ${orphans} from accounts that are gone.` : "."),
  );
  return { deleted: going.length, failed: 0 };
}
