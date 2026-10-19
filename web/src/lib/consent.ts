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
 *   - `founder_access` is not tied to the version. It is a separate tick in
 *     Settings with its own words, and bumping the AI wording must not quietly
 *     close a door the person deliberately opened.
 *
 * Nothing here reads the database. The rows come from the server, and these
 * rules are applied in the same way on the server and in the browser.
 */

/** Bump this when any wording below changes. */
export const WORDING_VERSION = "2026-10-19";

export type ConsentKind = "ai" | "ai_special" | "founder_access";

export type ConsentRow = {
  kind: string;
  granted: boolean;
  wording_version: string;
  recorded_at: string;
};

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
  founder_access: "Mwata may read my answers and my AI summary to guide me.",
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
  /** Mwata may read this person's answers. */
  founder: boolean;
  /** Nobody has answered the current wording yet: show the whole screen. */
  mustAsk: boolean;
  /** When the AI answer was recorded, for the line in Settings. */
  aiRecordedAt: string | null;
  version: string;
};

export function consentState(rows: ConsentRow[], version: string = WORDING_VERSION): ConsentState {
  const ai = latest(rows, "ai");
  const special = latest(rows, "ai_special");
  const founder = latest(rows, "founder_access");
  const current = (row: ConsentRow | null) => !!row && row.wording_version === version;
  return {
    ai: current(ai) && ai!.granted,
    special: current(special) && special!.granted,
    founder: !!founder?.granted,
    mustAsk: !current(ai),
    aiRecordedAt: ai?.recorded_at ?? null,
    version,
  };
}

/** The one rule the AI routes ask about. */
export function aiAllowed(rows: ConsentRow[], version: string = WORDING_VERSION): boolean {
  return consentState(rows, version).ai;
}

/** The one rule the admin routes ask about. */
export function founderAllowed(rows: ConsentRow[]): boolean {
  return consentState(rows).founder;
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
    const sameWords = kind === "founder_access" || now?.wording_version === version;
    if (now && sameWords && now.granted === granted) continue;
    out.push({ kind, granted, wording_version: version });
  }
  return out;
}

/** The AI partner message when consent was given once and then withdrawn. */
export const SWITCHED_OFF = "Your AI partner is switched off. You can switch it on again in My settings.";

/** Always under the chat box (legal review, part 1, point 8). */
export const AI_REMINDER =
  "You are talking to an AI, not a person. It can be wrong, and it does not give legal, tax, " +
  "immigration, medical or financial advice.";
export const SENSITIVE_REMINDER =
  "Please avoid health details and other sensitive data unless you want your AI partner to use them.";
