/*
 * Consent on the server, where the answer counts.
 *
 * Every AI route asks `whyNoAi` before a single word leaves the app. It reads
 * the consents table live, so a tick switched off in Settings stops the next
 * request rather than the next session.
 *
 * The reads use the service key and take the user id as an argument. Every
 * caller takes that id from the session it just checked, never from the
 * request body.
 *
 * Writing goes through `recordConsent`, which appends and never overwrites.
 * The database refuses an update anyway; the rule lives here too so it is
 * plain to the next person reading this.
 */
import {
  aiAllowed,
  aiRefusal,
  CONSENT_UNREADABLE,
  consentState,
  rowsToWrite,
  type ConsentKind,
  type ConsentRow,
  type ConsentState,
} from "@/lib/consent";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * This person's consent history.
 *
 * Null means the question could not be answered: no service key, the table
 * missing, the network gone. Callers treat null as "no", because a request
 * that goes ahead when we cannot prove consent is the exact thing the law is
 * about.
 */
export async function consentRows(userId: string): Promise<ConsentRow[] | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("consents")
    .select("kind, granted, wording_version, recorded_at")
    .eq("user_id", userId);
  if (error) {
    console.error("consents: could not be read:", error.message);
    return null;
  }
  return (data ?? []) as ConsentRow[];
}

/**
 * May this person's words be sent to Anthropic at all, and if not, why not?
 *
 * Null means yes. Everything else is the sentence the person sees, because
 * the three reasons for refusing are three different pieces of news (review
 * round 7, R7-10). An unreadable table says so rather than blaming them.
 */
export async function whyNoAi(userId: string): Promise<string | null> {
  const rows = await consentRows(userId);
  return rows === null ? CONSENT_UNREADABLE : aiRefusal(rows);
}

/**
 * Has the other person in a household switched their AI partner on?
 *
 * Null when the question could not be answered, which every caller treats as
 * no: the shared pages stay out of the AI partner's reach unless both ticks
 * can be shown (lawyer, 24 October, item B2).
 */
export async function aiOnFor(userId: string): Promise<boolean | null> {
  const rows = await consentRows(userId);
  return rows === null ? null : aiAllowed(rows);
}

/** Everything the screens need to draw the ticks. */
export async function myConsent(userId: string): Promise<ConsentState | null> {
  const rows = await consentRows(userId);
  return rows === null ? null : consentState(rows);
}

/**
 * Write down an answer somebody just gave.
 *
 * Only genuine changes are written, so pressing Save twice in Settings leaves
 * one row. Switching something off is a change and is always written: that row
 * is the record that the consent ended, and the minute it ended.
 */
export async function recordConsent(
  userId: string,
  answer: Partial<Record<ConsentKind, boolean>>,
  source: "app" | "settings",
): Promise<{ state: ConsentState; written: number } | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const rows = await consentRows(userId);
  if (rows === null) return null;

  /* No version is passed: each kind is recorded against its own words. */
  const wanted = rowsToWrite(rows, answer);
  if (wanted.length > 0) {
    const { error } = await admin.from("consents").insert(wanted.map((row) => ({ ...row, user_id: userId, source })));
    if (error) {
      console.error("consents: could not be written:", error.message);
      return null;
    }
  }

  const now: ConsentRow[] = [...rows, ...wanted.map((row) => ({ ...row, recorded_at: new Date().toISOString() }))];
  return { state: consentState(now), written: wanted.length };
}
