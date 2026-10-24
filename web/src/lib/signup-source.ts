/**
 * Where someone came from, and whether they want to hear about new things
 * (spec §6.2).
 *
 * The link can be shared as `app.maderealblueprint.com/free?from=instagram`.
 * The value lands in the person's profile, so Admin can show where people are
 * arriving from. It is written by strangers, so it is cleaned here before it
 * ever reaches the database or a screen: lower case, letters, digits, dash and
 * underscore, and short.
 *
 * Between the sign-up page and the consent page the person goes through their
 * email, so the two answers wait in this browser's session storage. Losing them
 * (another device, storage blocked) costs nothing — the account is still made.
 *
 * Nothing is imported here, so the cleaning can be tested on its own.
 */

export const MAX_SOURCE = 32;

/** What survives from `?from=…`: nothing at all, or a short plain word. */
export function cleanSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, MAX_SOURCE);
  return cleaned.length > 0 ? cleaned : null;
}

/** How a source reads in Admin, where "no answer" is worth seeing as such. */
export const sourceLabel = (source: string | null | undefined) => cleanSource(source) ?? "not known";

type Waiting = { from: string | null; wants_updates: boolean };

const KEY = "blueprint-signup-v1";

/** What is waiting now, or nothing at all. */
function waiting(): Waiting {
  const empty: Waiting = { from: null, wants_updates: false };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Waiting>;
    return { from: cleanSource(parsed.from), wants_updates: parsed.wants_updates === true };
  } catch {
    return empty;
  }
}

/**
 * Keep one of the two answers. They are written from different places now:
 * the source by the /free page, the updates tick by the sign-in form itself
 * (lawyer, 24 October), so one may never wipe out the other.
 */
export function rememberSignup(part: Partial<Waiting>) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...waiting(), ...part }));
  } catch {
    // Storage blocked: the account is made anyway, we simply do not know where from.
  }
}

/**
 * Did they tick the updates box before fetching their code?
 *
 * Read, not taken: the consent page still needs it, because somebody new has
 * no profile row for the answer to land in until they finish that screen.
 */
export const takeUpdatesTick = (): boolean => waiting().wants_updates;

/** Read it once, on the consent page, and forget it. */
export function takeSignup(): Waiting {
  const empty: Waiting = { from: null, wants_updates: false };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Waiting>;
    return { from: cleanSource(parsed.from), wants_updates: parsed.wants_updates === true };
  } catch {
    return empty;
  }
}
