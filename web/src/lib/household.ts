/**
 * A household: one buyer, and at most one partner (spec §6.8).
 *
 * The rules live here and take no database, so they can be tested on their own:
 * `householdFrom` turns the seat row into the three things the rest of the app
 * asks about, and `conflict` decides what to do when two people write the same
 * answer.
 *
 * The buyer owns the household. Shared answers are stored on their rows, which
 * is what makes "the answers stay with the buyer if the seat ends" true without
 * anything having to be moved.
 */

export type SeatStatus = "invited" | "active" | "ended";

export type Seat = {
  buyer_id: string;
  email: string;
  partner_id: string | null;
  status: SeatStatus;
  invited_at?: string;
  joined_at?: string | null;
};

export type Household = {
  /** Whose rows hold the shared answers. */
  ownerId: string;
  /** The other person, when there is one and they have signed in. */
  otherId: string | null;
  /** How this person sits in it. */
  role: "alone" | "buyer" | "partner";
  /** The invited address, while a seat exists. */
  email: string | null;
  /** An invitation that has been sent but not yet used. */
  waiting: boolean;
};

export const alone = (userId: string): Household => ({
  ownerId: userId,
  otherId: null,
  role: "alone",
  email: null,
  waiting: false,
});

/**
 * The household a person is in, from the seat row that mentions them.
 *
 * `seat` is the row where this person is either the buyer or the partner. An
 * ended seat is no household at all: the partner keeps their own answers and
 * sees nothing of the buyer's.
 */
export function householdFrom(userId: string, seat: Seat | null | undefined): Household {
  if (!seat || seat.status === "ended") return alone(userId);

  if (seat.buyer_id === userId) {
    return {
      ownerId: userId,
      otherId: seat.status === "active" ? seat.partner_id : null,
      role: "buyer",
      email: seat.email,
      waiting: seat.status === "invited" || !seat.partner_id,
    };
  }

  if (seat.partner_id === userId && seat.status === "active") {
    return { ownerId: seat.buyer_id, otherId: seat.buyer_id, role: "partner", email: seat.email, waiting: false };
  }

  return alone(userId);
}

/** Is there a second person in this household who has signed in? */
export const isPair = (household: Household) => household.otherId !== null;

/**
 * May this person write the shared answers of this household?
 *
 * Both of them may. The check exists so a route can say no to anybody else,
 * including a partner whose seat has ended.
 */
export function mayWriteShared(household: Household, userId: string): boolean {
  if (household.role === "alone") return household.ownerId === userId;
  return household.role === "buyer" || (household.role === "partner" && isPair(household));
}

/**
 * Two people in one money table.
 *
 * Answers are stored per field with the moment they were last written, so a
 * save can say honestly whether the other person got there first. Nothing is
 * ever thrown away silently: the page asks.
 */
export type Conflict = { kind: "none" } | { kind: "theirs"; changedBy: string; at: string };

export function conflict(
  stored: { changed_by?: string | null; updated_at?: string | null } | null | undefined,
  who: { userId: string; loadedAt: string },
): Conflict {
  if (!stored?.updated_at) return { kind: "none" };
  // My own writing is not a conflict, however long ago it was.
  if (stored.changed_by === who.userId) return { kind: "none" };
  // Anything already there when this page was loaded is not a clash either:
  // it is what the page was showing.
  if (new Date(stored.updated_at).getTime() <= new Date(who.loadedAt).getTime()) return { kind: "none" };
  /*
   * An answer with nobody's name on it, written since the page was loaded.
   *
   * Review round 6, finding R6-1: this used to count as "mine", because every
   * answer written before seats existed has no name on it. But those are all
   * older than the page load and are caught above, so what is left is an
   * answer that appeared just now and cannot be accounted for. Overwriting it
   * silently is the one thing promise 5 says never happens, so it asks.
   */
  return { kind: "theirs", changedBy: stored.changed_by ?? "someone", at: stored.updated_at };
}

/** An invitation can only go to one address, and not to yourself. */
export function invitationProblem(email: string, myEmail: string | null | undefined): string | null {
  const address = email.trim().toLowerCase();
  if (!address) return "Please type the email address of the person you are planning this with.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) return "That does not look like an email address.";
  if (myEmail && address === myEmail.trim().toLowerCase()) return "That is your own address. The seat is for someone else.";
  return null;
}
