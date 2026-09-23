// What the AI partner remembers about a person (build brief 4.4), with the
// plain-language labels shown on "What my AI partner knows about me".
// Shared by the browser and the server; no secrets here.

export const PROFILE_FIELDS = [
  { key: "life_picture", label: "Your life picture", kind: "text" },
  { key: "happy_moments_theme", label: "What your good moments have in common", kind: "text" },
  { key: "values", label: "What matters most to you", kind: "list" },
  { key: "must_haves", label: "Your must-haves", kind: "list" },
  { key: "dealbreakers", label: "Your dealbreakers", kind: "list" },
  { key: "wheel_scores", label: "Your life today and in one year", kind: "text" },
  { key: "strengths", label: "Your strengths and support", kind: "list" },
  { key: "beliefs", label: "Beliefs you want to check", kind: "list" },
  { key: "money", label: "Your money picture", kind: "text" },
  { key: "options", label: "Your options", kind: "list" },
  { key: "fears", label: "Your fears and what you can do", kind: "list" },
  { key: "places", label: "Places you are exploring", kind: "text" },
  { key: "open_questions", label: "Your open questions", kind: "list" },
  { key: "patterns_and_tensions", label: "Patterns and things that pull in two directions", kind: "list" },
] as const;

export type ProfileKey = (typeof PROFILE_FIELDS)[number]["key"];

/** The stored profile: the items, plus what the person corrected or asked to forget. */
export type AiProfile = Partial<Record<ProfileKey, string | string[]>> & {
  /** Items the person corrected: the partner keeps their version. */
  _locked?: ProfileKey[];
  /** Items the person asked to forget: the partner leaves them empty. */
  _forgotten?: ProfileKey[];
  last_updated?: string;
};

/**
 * Where each note comes from: the pages (and, when given, only those fields).
 * "Forget this" hides these answers from the AI partner; the person still sees them.
 * patterns_and_tensions has no own pages: it is drawn from the others.
 */
export const PROFILE_SOURCES: Record<ProfileKey, { page: string; fields?: string[] }[]> = {
  life_picture: [
    { page: "1.2" },
    { page: "life_picture" },
    { page: "5.1", fields: ["life_picture"] },
    { page: "s2-0.1", fields: ["life_picture"] },
  ],
  happy_moments_theme: [{ page: "1.1" }, { page: "0.1", fields: ["moment"] }],
  values: [{ page: "1.4", fields: ["values", "top_two"] }],
  must_haves: [
    { page: "1.4", fields: ["must_haves"] },
    { page: "s2-0.1", fields: ["must_haves"] },
  ],
  dealbreakers: [
    { page: "1.4", fields: ["dealbreakers"] },
    { page: "s2-0.1", fields: ["dealbreakers"] },
  ],
  wheel_scores: [{ page: "2.1" }],
  strengths: [{ page: "2.2" }],
  beliefs: [{ page: "2.4" }],
  money: [
    { page: "3.1" },
    { page: "3.2" },
    { page: "3.3" },
    { page: "3.4" },
    { page: "3.5" },
    { page: "money_picture" },
    { page: "p3-setup" },
    { page: "s2-3.1" },
    { page: "s2-5.2" },
  ],
  options: [{ page: "4.1" }, { page: "4.2" }, { page: "4.3" }],
  fears: [{ page: "4.4" }],
  places: [
    { page: "s2-1.2" },
    { page: "s2-2.3" },
    { page: "s2-3.3" },
    { page: "s2-country_choice" },
    { page: "s2-region_shortlist" },
    { page: "s2-place_profiles" },
    { page: "s2-test_visit" },
    { page: "s2-5.1", fields: ["place", "location"] },
  ],
  open_questions: [{ page: "0.1", fields: ["big_question"] }],
  patterns_and_tensions: [],
};

/**
 * The answers the AI partner may use: everything except the sources of
 * forgotten notes. The page the person is on now stays visible (they are
 * asking about it right now).
 */
export function answersWithoutForgotten<T>(
  answers: Record<string, Record<string, T>>,
  forgotten: readonly ProfileKey[] | undefined,
  currentPage = "",
): Record<string, Record<string, T>> {
  if (!forgotten?.length) return answers;
  const out: Record<string, Record<string, T>> = {};
  for (const [page, fields] of Object.entries(answers)) out[page] = { ...fields };
  for (const key of forgotten) {
    for (const { page, fields } of PROFILE_SOURCES[key] ?? []) {
      if (page === currentPage || !out[page]) continue;
      if (!fields) delete out[page];
      else for (const f of fields) delete out[page][f];
    }
  }
  return out;
}

const emptyValue = (key: ProfileKey) => (PROFILE_FIELDS.find((f) => f.key === key)!.kind === "list" ? [] : "");

/**
 * The person's own choices always win. Call this with the notes as they are
 * in the database *right before saving* — so a "Forget this" or "Correct this"
 * made while the AI model was busy is never overwritten (review R2-1).
 */
export function applyPersonChoices(next: AiProfile, latest: AiProfile): AiProfile {
  const out: AiProfile = { ...next, _locked: latest._locked ?? [], _forgotten: latest._forgotten ?? [] };
  for (const key of out._locked!) out[key] = latest[key];
  for (const key of out._forgotten!) out[key] = emptyValue(key);
  // A forgotten topic must not live on inside the patterns note (review R2 concern 1).
  if (out._forgotten!.length && !out._locked!.includes("patterns_and_tensions")) {
    const changedForget = (latest._forgotten ?? []).some((k) => !(next._forgotten ?? []).includes(k));
    if (changedForget) out.patterns_and_tensions = [];
  }
  return out;
}

export function isEmptyItem(v: string | string[] | undefined) {
  return v === undefined || (Array.isArray(v) ? v.every((x) => !x.trim()) : !v.trim());
}
