/**
 * The household against the database (spec §6.8).
 *
 * Everything here runs on the server with the service role, because a shared
 * answer belongs to the buyer's rows and row-level security says "your own rows
 * only". That rule stays: a partner who asks Supabase directly for the buyer's
 * answers still gets nothing. This file is the one door, and it checks the
 * household and the page before it opens.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { conflict, householdFrom, mayWriteShared, type Conflict, type Household, type Seat } from "@/lib/household";
import { hasWritten } from "@/lib/compare";
import { mayCompare, waitingBecause } from "@/lib/together";
import { mayKeepPrivate, sharedAnswer, sharedStatus } from "@/lib/together-app";

type Admin = SupabaseClient;

/**
 * The seat this person is named in, as buyer or as partner.
 *
 * Review round 6, finding R6-2: this used to ask for a single row and throw the
 * error away, so two matching rows, or a database that was simply unwell, read
 * as "no seat at all" and quietly dissolved a household. Now an error is
 * raised, and more than one row is resolved rather than guessed at: a person's
 * own purchase governs their shared answers, and an active seat beats an
 * invitation that was never used.
 */
export async function seatOf(admin: Admin, userId: string): Promise<Seat | null> {
  const { data, error } = await admin
    .from("partner_seats")
    .select("buyer_id, email, partner_id, status, invited_at, joined_at")
    .or(`buyer_id.eq.${userId},partner_id.eq.${userId}`)
    .neq("status", "ended")
    .limit(5);
  if (error) {
    // The caller decides what to do, and every caller fails closed: a shared
    // answer waits rather than going to one person's own rows.
    throw new Error(`the partner seat could not be read: ${error.message}`);
  }
  const rows = (data ?? []) as Seat[];
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    console.warn(`partner seats: ${rows.length} rows mention ${userId}; using their own purchase first.`);
  }
  return rows.find((r) => r.buyer_id === userId) ?? rows.find((r) => r.status === "active") ?? rows[0];
}

/** The household this person is in. Reads, changes nothing. */
export async function householdOf(admin: Admin, userId: string): Promise<{ household: Household; seat: Seat | null }> {
  const seat = await seatOf(admin, userId);
  return { household: householdFrom(userId, seat), seat };
}

/**
 * The household, and a partner's first visit turned into a seat that is in use.
 *
 * The flip happens when the app loads, so there is no separate "accept" step to
 * press and nothing is left half-joined if they never press anything. Only the
 * app's own household route calls this; every other reader uses `householdOf`,
 * which changes nothing.
 */
export async function joinAndRead(admin: Admin, userId: string): Promise<{ household: Household; seat: Seat | null }> {
  let seat = await seatOf(admin, userId);
  if (seat && seat.status === "invited" && seat.partner_id === userId) {
    const { data } = await admin
      .from("partner_seats")
      .update({ status: "active", joined_at: new Date().toISOString() })
      .eq("buyer_id", seat.buyer_id)
      .select("buyer_id, email, partner_id, status, invited_at, joined_at")
      .maybeSingle();
    seat = (data as Seat | null) ?? { ...seat, status: "active" };
  }
  return { household: householdFrom(userId, seat), seat };
}

export type SharedState = {
  answers: Record<string, Record<string, unknown>>;
  statuses: Record<string, string>;
  /** Who last wrote each shared answer, for the line that says so. */
  changed: Record<string, { by: string; at: string }>;
};

/**
 * Every shared answer of this household, and nothing else.
 *
 * The filter is the page list, not the person: a personal answer of the other
 * person is never read here, whatever the caller asks for.
 */
export async function sharedState(admin: Admin, household: Household): Promise<SharedState> {
  const empty: SharedState = { answers: {}, statuses: {}, changed: {} };
  if (household.role === "alone") return empty;

  const [{ data: rows }, { data: statusRows }] = await Promise.all([
    admin
      .from("answers")
      .select("exercise_id, field_id, value, changed_by, updated_at")
      .eq("user_id", household.ownerId),
    admin.from("exercise_status").select("exercise_id, status").eq("user_id", household.ownerId),
  ]);

  const state: SharedState = { answers: {}, statuses: {}, changed: {} };
  for (const row of rows ?? []) {
    if (!sharedAnswer(row.exercise_id, row.field_id)) continue;
    state.answers[row.exercise_id] ??= {};
    state.answers[row.exercise_id][row.field_id] = row.value;
    if (row.changed_by) state.changed[`${row.exercise_id}/${row.field_id}`] = { by: row.changed_by, at: row.updated_at };
  }
  for (const row of statusRows ?? []) {
    if (sharedStatus(row.exercise_id)) state.statuses[row.exercise_id] = row.status;
  }
  return state;
}

export type WriteResult = { saved: true } | { saved: false; conflict: Conflict; theirs: unknown };

/**
 * Write one shared answer.
 *
 * Refused unless the page really is a shared one, so a mistake in the browser
 * cannot write a personal answer onto somebody else's rows. If the other person
 * has written that same box since this page was loaded, nothing is saved and
 * the page is told, so it can ask which answer to keep.
 */
export async function writeShared(
  admin: Admin,
  household: Household,
  userId: string,
  item: { exerciseId: string; fieldId: string; value: unknown; loadedAt: string; force?: boolean },
): Promise<WriteResult | { error: string }> {
  if (!sharedAnswer(item.exerciseId, item.fieldId)) return { error: "That answer is not a shared one." };
  if (!mayWriteShared(household, userId)) return { error: "That is not your household." };

  const { data: stored } = await admin
    .from("answers")
    .select("value, changed_by, updated_at")
    .eq("user_id", household.ownerId)
    .eq("exercise_id", item.exerciseId)
    .eq("field_id", item.fieldId)
    .maybeSingle();

  if (!item.force) {
    const clash = conflict(stored, { userId, loadedAt: item.loadedAt });
    if (clash.kind === "theirs") return { saved: false, conflict: clash, theirs: stored?.value ?? null };
  }

  const row = {
    user_id: household.ownerId,
    exercise_id: item.exerciseId,
    field_id: item.fieldId,
    value: item.value as never,
    changed_by: userId,
    updated_at: new Date().toISOString(),
  };

  /*
   * Written only if nothing moved since it was read.
   *
   * Review round 6 asked about the gap between the read above and the write
   * below: two saves a few milliseconds apart would both pass the check and
   * the second would win silently. So the update carries the timestamp it
   * expects to find. If the row has changed, nothing is written and the clash
   * comes back with whatever is there now, which is the same answer the check
   * above would have given a moment earlier.
   */
  if (stored?.updated_at) {
    const { data: written, error } = await admin
      .from("answers")
      .update(row)
      .eq("user_id", household.ownerId)
      .eq("exercise_id", item.exerciseId)
      .eq("field_id", item.fieldId)
      .eq("updated_at", stored.updated_at)
      .select("field_id");
    if (error) return { error: error.message };
    if ((written ?? []).length > 0) return { saved: true };
    if (item.force) {
      // The person chose this answer knowing the other one; a write that slid
      // in between does not change that.
      const { error: forced } = await admin
        .from("answers")
        .upsert(row, { onConflict: "user_id,exercise_id,field_id" });
      return forced ? { error: forced.message } : { saved: true };
    }
    const { data: now } = await admin
      .from("answers")
      .select("value, changed_by, updated_at")
      .eq("user_id", household.ownerId)
      .eq("exercise_id", item.exerciseId)
      .eq("field_id", item.fieldId)
      .maybeSingle();
    return {
      saved: false,
      conflict: { kind: "theirs", changedBy: now?.changed_by ?? "someone", at: now?.updated_at ?? row.updated_at },
      theirs: now?.value ?? null,
    };
  }

  // Nothing there yet. An insert that loses a race fails on the primary key
  // rather than overwriting, and then it is a clash like any other.
  const { error } = await admin.from("answers").insert(row);
  if (!error) return { saved: true };
  if (item.force) {
    const { error: forced } = await admin.from("answers").upsert(row, { onConflict: "user_id,exercise_id,field_id" });
    return forced ? { error: forced.message } : { saved: true };
  }
  const { data: now } = await admin
    .from("answers")
    .select("value, changed_by, updated_at")
    .eq("user_id", household.ownerId)
    .eq("exercise_id", item.exerciseId)
    .eq("field_id", item.fieldId)
    .maybeSingle();
  if (!now) return { error: error.message };
  return {
    saved: false,
    conflict: { kind: "theirs", changedBy: now.changed_by ?? "someone", at: now.updated_at ?? row.updated_at },
    theirs: now.value ?? null,
  };
}

/** A shared page that is finished is finished for both, so its progress is the household's. */
export async function writeSharedStatus(
  admin: Admin,
  household: Household,
  userId: string,
  item: { exerciseId: string; status: string },
): Promise<{ saved: true } | { error: string }> {
  if (!sharedStatus(item.exerciseId)) return { error: "That page is not a shared one." };
  if (!mayWriteShared(household, userId)) return { error: "That is not your household." };
  const { error } = await admin.from("exercise_status").upsert(
    {
      user_id: household.ownerId,
      exercise_id: item.exerciseId,
      status: item.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exercise_id" },
  );
  return error ? { error: error.message } : { saved: true };
}

/** The other person's first name, for "Ben changed this": nothing else of theirs. */
export async function otherName(admin: Admin, household: Household): Promise<string | null> {
  if (!household.otherId) return null;
  const { data } = await admin
    .from("profiles")
    .select("first_name")
    .eq("user_id", household.otherId)
    .maybeSingle();
  const name = (data as { first_name?: string | null } | null)?.first_name?.trim();
  return name || null;
}

/**
 * What the household owns.
 *
 * A partner's access follows the buyer's, so it is read rather than copied: a
 * refund ends the buyer's entitlement and the partner loses access in the same
 * moment, with nothing to keep in step. Their own purchases, if they have any,
 * still count.
 */
export async function householdEntitlements(
  admin: Admin,
  household: Household,
  mine: { product: string; status: string }[],
): Promise<{ product: string; status: string }[]> {
  if (household.role !== "partner") return mine;
  const { data } = await admin.from("entitlements").select("product, status").eq("user_id", household.ownerId);
  return [...mine, ...((data ?? []) as { product: string; status: string }[])];
}

/**
 * Everything this person's AI partner may see.
 *
 * Their own answers, with the household's shared answers laid over the top.
 * Never one of the other person's personal answers: that is the promise the
 * seat rests on, and it is kept here rather than in the prompt, because a
 * prompt can be talked round and a query cannot.
 */
export async function answersIMaySee(
  supabase: { from: (table: string) => { select: (columns: string) => PromiseLike<{ data: unknown }> } },
  admin: Admin | null,
  userId: string,
): Promise<Record<string, Record<string, unknown>>> {
  const { data } = await supabase.from("answers").select("exercise_id, field_id, value");
  const answers: Record<string, Record<string, unknown>> = {};
  for (const row of (data ?? []) as { exercise_id: string; field_id: string; value: unknown }[]) {
    (answers[row.exercise_id] ??= {})[row.field_id] = row.value;
  }
  if (!admin) return answers;

  const { household } = await householdOf(admin, userId);
  if (household.role === "alone" || household.ownerId === userId) return answers;

  const shared = await sharedState(admin, household);
  for (const [exerciseId, fields] of Object.entries(shared.answers)) {
    answers[exerciseId] = { ...answers[exerciseId], ...fields };
  }
  return answers;
}

/* ---------------------------------------------------------------------------
 * The comparison (slice 2).
 *
 * Reading the other person's answers happens here and nowhere else, and it
 * happens behind three questions: have I written mine, have they written
 * theirs, and have they kept this page private. The server holds both sides
 * either way; what matters is what it hands over.
 * ------------------------------------------------------------------------- */

/** Everything one person wrote on one page, leaving out what is shared. */
async function pageAnswersOf(
  admin: Admin,
  userId: string,
  exerciseId: string,
): Promise<Record<string, unknown>> {
  const { data } = await admin
    .from("answers")
    .select("field_id, value")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId);
  const out: Record<string, unknown> = {};
  for (const row of (data ?? []) as { field_id: string; value: unknown }[]) {
    // The agreed answer belongs to both of them and is shown on its own, so it
    // is not one of the two sides.
    if (sharedAnswer(exerciseId, row.field_id)) continue;
    out[row.field_id] = row.value;
  }
  return out;
}

/** The pages this person is holding back for good. */
export async function privatePagesOf(admin: Admin, userId: string): Promise<string[]> {
  const { data } = await admin.from("private_pages").select("exercise_id").eq("user_id", userId);
  return ((data ?? []) as { exercise_id: string }[]).map((r) => r.exercise_id);
}

export type PageCompare = {
  mineWritten: boolean;
  theirsWritten: boolean;
  theirsPrivate: boolean;
  minePrivate: boolean;
  may: boolean;
  waiting: ReturnType<typeof waitingBecause>;
  /** Their answers, and only when all three questions allow it. */
  theirs: Record<string, unknown> | null;
  theirName: string | null;
};

export async function comparePage(
  admin: Admin,
  household: Household,
  userId: string,
  exerciseId: string,
): Promise<PageCompare> {
  const empty: PageCompare = {
    mineWritten: false,
    theirsWritten: false,
    theirsPrivate: false,
    minePrivate: false,
    may: false,
    waiting: "neither",
    theirs: null,
    theirName: null,
  };
  if (!household.otherId) return empty;

  const [mine, theirs, mineHidden, theirsHidden, name] = await Promise.all([
    pageAnswersOf(admin, userId, exerciseId),
    pageAnswersOf(admin, household.otherId, exerciseId),
    privatePagesOf(admin, userId),
    privatePagesOf(admin, household.otherId),
    otherName(admin, household),
  ]);

  const state = {
    mineWritten: hasWritten(mine),
    theirsWritten: hasWritten(theirs),
    theirsPrivate: theirsHidden.includes(exerciseId),
    minePrivate: mineHidden.includes(exerciseId),
  };
  const may = mayCompare(state);
  return {
    ...state,
    may,
    waiting: waitingBecause(state),
    theirs: may ? theirs : null,
    theirName: name,
  };
}

/**
 * The same three questions for a whole step, as yes or no and nothing else.
 *
 * This is what a step page needs to say "Ben has written 1.4 and 2.1", and it
 * carries none of their words, so it is safe to ask for at any time.
 */
export async function compareStep(
  admin: Admin,
  household: Household,
  userId: string,
  pageIds: string[],
): Promise<{ pages: Record<string, { mineWritten: boolean; theirsWritten: boolean; may: boolean }>; theirName: string | null }> {
  if (!household.otherId) return { pages: {}, theirName: null };

  const [mineRows, theirRows, theirsHidden, mineHidden, name] = await Promise.all([
    admin.from("answers").select("exercise_id, field_id, value").eq("user_id", userId).in("exercise_id", pageIds),
    admin
      .from("answers")
      .select("exercise_id, field_id, value")
      .eq("user_id", household.otherId)
      .in("exercise_id", pageIds),
    privatePagesOf(admin, household.otherId),
    privatePagesOf(admin, userId),
    otherName(admin, household),
  ]);

  const gather = (rows: unknown) => {
    const by: Record<string, Record<string, unknown>> = {};
    for (const row of (rows ?? []) as { exercise_id: string; field_id: string; value: unknown }[]) {
      if (sharedAnswer(row.exercise_id, row.field_id)) continue;
      (by[row.exercise_id] ??= {})[row.field_id] = row.value;
    }
    return by;
  };
  const mine = gather(mineRows.data);
  const theirs = gather(theirRows.data);

  const pages: Record<string, { mineWritten: boolean; theirsWritten: boolean; may: boolean }> = {};
  for (const id of pageIds) {
    const state = {
      mineWritten: hasWritten(mine[id]),
      theirsWritten: hasWritten(theirs[id]),
      theirsPrivate: theirsHidden.includes(id),
      minePrivate: mineHidden.includes(id),
    };
    pages[id] = { mineWritten: state.mineWritten, theirsWritten: state.theirsWritten, may: mayCompare(state) };
  }
  return { pages, theirName: name };
}

/** Keep a page private, or stop keeping it private. Only the person's own. */
export async function setPrivate(
  admin: Admin,
  userId: string,
  exerciseId: string,
  keepPrivate: boolean,
): Promise<{ ok: true } | { error: string }> {
  if (!mayKeepPrivate(exerciseId)) return { error: "That page is not one you can keep private." };
  const query = keepPrivate
    ? admin.from("private_pages").upsert({ user_id: userId, exercise_id: exerciseId }, { onConflict: "user_id,exercise_id" })
    : admin.from("private_pages").delete().eq("user_id", userId).eq("exercise_id", exerciseId);
  const { error } = await query;
  return error ? { error: error.message } : { ok: true };
}
