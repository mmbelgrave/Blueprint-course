/**
 * The comparison, as the browser asks for it (spec §6.8, slice 2).
 *
 * The browser never reads the other person's answers from Supabase: it asks
 * this route, which answers the three questions first. A page that is still
 * waiting gets booleans and nothing else.
 */

export type PageCompare = {
  mineDone: boolean;
  theirsDone: boolean;
  theirsPrivate: boolean;
  minePrivate: boolean;
  may: boolean;
  waiting: "mine-private" | "theirs-private" | "neither" | "only-them" | "only-me" | null;
  theirs: Record<string, unknown> | null;
  theirName: string | null;
};

export type StepCompare = {
  pages: Record<string, { mineDone: boolean; theirsDone: boolean; may: boolean }>;
  theirName: string | null;
};

const ask = async (query: string) => {
  try {
    const res = await fetch(`/api/household/compare?${query}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.role === "alone" ? null : data;
  } catch {
    return null;
  }
};

/** One page. Null when there is nobody to compare with. */
export const fetchPageCompare = (exerciseId: string): Promise<PageCompare | null> =>
  ask(`page=${encodeURIComponent(exerciseId)}`);

/** A whole step, as yes or no per page. */
export const fetchStepCompare = (step: number): Promise<StepCompare | null> => ask(`step=${step}`);

/** Keep this page private for good, or stop keeping it private. */
export async function setPagePrivate(exerciseId: string, keepPrivate: boolean): Promise<boolean> {
  try {
    const res = await fetch("/api/household/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ exerciseId, keepPrivate }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** How often a waiting page asks again, in milliseconds. */
export const WAIT_POLL_MS = 20_000;
