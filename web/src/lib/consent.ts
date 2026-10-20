/*
 * What somebody agreed to, worked out from their consent history.
 *
 * The rules, from the legal review of 18 October:
 *
 *   - The AI partner needs a granted `ai` row at the current wording version.
 *     No row, a refused row, or a row at older wording, and it stays off.
 *   - `ai_special` is a second, optional tick: explicit consent for special
 *     categories of data. The AI works without it.
 *   - Changing the words bumps WORDING_VERSION, and everybody is asked again.
 *   - `founder_access` was a third tick, "Mwata may read my answers", removed
 *     on 20 October 2026 with the service that needed it. Nothing asks for it
 *     any more; its rows stay in the table as the record that it was given and
 *     when it ended, so anything reading history still has to expect the kind.
 *
 * Nothing here reads the database. The rows come from the server, and these
 * rules are applied in the same way on the server and in the browser.
 */

/** Bump this when any wording below changes. */
export const WORDING_VERSION = "2026-10-19";

export type ConsentKind = "ai" | "ai_special";

export type ConsentRow = {
  kind: string;
  granted: boolean;
  wording_version: string;
  recorded_at: string;
};

/**
 * The disclosure above the boxes: what is sent, to whom, where they are, and
 * what they do with it. Review round 7 (R7-6): the version covered the two
 * checkbox sentences and not this, so Anthropic could be swapped for another
 * company, or 30 days for 90, without anybody being asked again.
 */
export const CONSENT_DISCLOSURE = [
  "If you switch it on, what you write in this chat, your answers on this page and your earlier answers are sent to Anthropic, the company whose AI model it uses. Anthropic is in the United States. It does not use what you write to train its models, and it deletes what it receives within 30 days, unless the law requires otherwise or a message is flagged for misuse. Your AI partner also keeps short notes about your answers, which you can read and delete under What my AI partner knows.",
  "Please avoid special categories of data, for example health, religion, sexual orientation or political opinions, unless you want your AI partner to take them into account.",
];

/** The words people read. Kept here so a version always means one text. */
/*
 * The words are the lawyer's, from section D2 of "Legal text to paste" of
 * 18 October, split into two boxes: the sentence about what is sent, and the
 * sentence about sensitive information. Splitting them is what makes the
 * second one an explicit consent somebody can refuse on its own.
 */
export const CONSENT_TEXT: Record<ConsentKind, string> = {
  ai:
    "I agree that what I write in the chat, and the earlier answers my AI partner needs, " +
    "are sent to Anthropic in the United States so my AI partner can reply. " +
    "I can withdraw this at any time in Settings.",
  ai_special:
    "If I choose to write sensitive information (for example about health, religion, sexual orientation " +
    "or political opinions), I explicitly consent to it being processed in this way.",
};

/** The newest row of this kind, or null. Rows may arrive in any order. */
export function latest(rows: ConsentRow[], kind: ConsentKind): ConsentRow | null {
  let newest: ConsentRow | null = null;
  for (const row of rows) {
    if (row.kind !== kind) continue;
    if (!newest || new Date(row.recorded_at).getTime() > new Date(newest.recorded_at).getTime()) newest = row;
  }
  return newest;
}

export type ConsentState = {
  /** The AI partner may run. */
  ai: boolean;
  /** Special categories of data are covered as well. */
  special: boolean;
  /** Nobody has answered the current wording yet: show the whole screen. */
  mustAsk: boolean;
  /** When the AI answer was recorded, for the line in Settings. */
  aiRecordedAt: string | null;
  version: string;
};

export function consentState(rows: ConsentRow[], version: string = WORDING_VERSION): ConsentState {
  const ai = latest(rows, "ai");
  const special = latest(rows, "ai_special");
  const current = (row: ConsentRow | null) => !!row && row.wording_version === version;
  return {
    ai: current(ai) && ai!.granted,
    special: current(special) && special!.granted,
    mustAsk: !current(ai),
    aiRecordedAt: ai?.recorded_at ?? null,
    version,
  };
}

/** The one rule the AI routes ask about. */
export function aiAllowed(rows: ConsentRow[], version: string = WORDING_VERSION): boolean {
  return consentState(rows, version).ai;
}

/**
 * The rows worth writing for an answer somebody just gave.
 *
 * A tick that says what the newest row already says, at the current wording,
 * is not a change and is not written again: pressing Save in Settings twice
 * should not fill the history with noise. Anything else is written, including
 * every switching off, because that is the record that the consent ended.
 */
export function rowsToWrite(
  rows: ConsentRow[],
  answer: Partial<Record<ConsentKind, boolean>>,
  version: string = WORDING_VERSION,
): { kind: ConsentKind; granted: boolean; wording_version: string }[] {
  const out: { kind: ConsentKind; granted: boolean; wording_version: string }[] = [];
  for (const kind of Object.keys(answer) as ConsentKind[]) {
    const granted = answer[kind];
    if (typeof granted !== "boolean") continue;
    const now = latest(rows, kind);
    const sameWords = now?.wording_version === version;
    if (now && sameWords && now.granted === granted) continue;
    out.push({ kind, granted, wording_version: version });
  }
  return out;
}

/** The AI partner message when consent was given once and then withdrawn. */
export const SWITCHED_OFF = "Your AI partner is switched off. You can switch it on again in My settings.";

/*
 * The three refusals, which look the same to the code and nothing like each
 * other to the person reading them (review round 7, R7-10).
 *
 * "Switched off" is true only when they switched it off. A wording change asks
 * everybody again, and telling those people they had turned something off
 * would be wrong twice over: they did not, and Settings will show the box
 * still ticked. Somebody who has never answered has not refused anything
 * either. And a consents table we cannot read is our fault, not theirs.
 */
export const ASK_AGAIN =
  "We have updated what we ask you to agree to. Please read it once more and agree, and your AI partner carries on.";
export const NOT_ASKED_YET = "Your AI partner asks for your agreement first. Open the panel and you will be asked.";
export const CONSENT_UNREADABLE = "Your AI partner could not be reached just now. Please reload the page.";

/**
 * Null when the AI partner may run; otherwise the sentence to show.
 *
 * The same rule as `aiAllowed`, which is deliberate: one rule decides, and
 * this only adds which of the three things happened.
 */
export function aiRefusal(rows: ConsentRow[], version: string = WORDING_VERSION): string | null {
  if (aiAllowed(rows, version)) return null;
  const ai = latest(rows, "ai");
  if (!ai) return NOT_ASKED_YET;
  return ai.wording_version === version ? SWITCHED_OFF : ASK_AGAIN;
}

/** Always under the chat box (legal review, part 1, point 8). */
export const AI_REMINDER =
  "You are talking to an AI, not a person. It can be wrong, and it does not give legal, tax, " +
  "immigration, medical or financial advice.";
export const SENSITIVE_REMINDER =
  "Please avoid health details and other sensitive data unless you want your AI partner to use them.";

/**
 * How long a consent record is kept after the consent it records has ended.
 *
 * Three years, which is the period on both privacy pages. A row ends when a
 * newer row of the same kind replaces it, or, for the newest row, when that
 * row is itself a refusal: the consent stopped at that minute.
 *
 * The current row of each kind is never deleted while it still stands. It is
 * the proof that what the app does today is allowed.
 */
export const CONSENT_HISTORY_YEARS = 3;

type Numbered = ConsentRow & { id: number };

/** When this row stopped being the operative consent, or null if it still is. */
function endedAt(rows: Numbered[], row: Numbered): string | null {
  const newer = rows
    .filter((r) => r.kind === row.kind && new Date(r.recorded_at).getTime() > new Date(row.recorded_at).getTime())
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())[0];
  if (newer) return newer.recorded_at;
  // The newest row of its kind. A refusal ends a consent the moment it is
  // written; a grant has not ended at all.
  return row.granted ? null : row.recorded_at;
}

/**
 * The consent rows that may go today.
 *
 * Deleting the last row of a kind simply means the person is asked again, so
 * nothing breaks and nothing is assumed.
 */
export function expiredConsentIds(rows: Numbered[], now: Date | string = new Date()): number[] {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - CONSENT_HISTORY_YEARS);
  const out: number[] = [];
  for (const row of rows) {
    const ended = endedAt(rows, row);
    if (ended && new Date(ended).getTime() <= cutoff.getTime()) out.push(row.id);
  }
  return out;
}
