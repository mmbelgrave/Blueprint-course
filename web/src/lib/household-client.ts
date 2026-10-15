/**
 * The household, as the browser sees it (spec §6.8).
 *
 * Shared answers do not go to Supabase from here: they live on the buyer's rows
 * and row-level security says "your own rows only", so they go through
 * /api/household, which checks the household and the page. Everything personal
 * still takes the old, direct path.
 */
import type { Entitlement } from "@/lib/access";
import type { Answers, ExerciseStatus } from "@/lib/backend";

export type HouseholdRole = "alone" | "buyer" | "partner";

export type Household = {
  role: HouseholdRole;
  /** The invited address, while a seat exists. */
  email: string | null;
  /** An invitation sent but not yet used. */
  waiting: boolean;
  /** The other person's first name, when they have told us one. */
  otherName: string | null;
  /** Who last wrote each shared answer, keyed "exercise/field". */
  changed: Record<string, { who: "me" | "them"; at: string }>;
  /** When the browser last had the truth, for the conflict check on save. */
  at: string;
};

export type HouseholdLoad = {
  household: Household;
  answers: Answers;
  statuses: Record<string, ExerciseStatus>;
  entitlements: Entitlement[] | null;
};

export const workingAlone = (at = new Date().toISOString()): Household => ({
  role: "alone",
  email: null,
  waiting: false,
  otherName: null,
  changed: {},
  at,
});

/** What the household looks like now. Returns null when it cannot be asked. */
export async function fetchHousehold(): Promise<HouseholdLoad | null> {
  try {
    const res = await fetch("/api/household", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const at = typeof data.at === "string" ? data.at : new Date().toISOString();
    if (data.role === "alone" || !data.role) {
      return { household: workingAlone(at), answers: {}, statuses: {}, entitlements: null };
    }
    return {
      household: {
        role: data.role,
        email: data.email ?? null,
        waiting: Boolean(data.waiting),
        otherName: data.other?.name ?? null,
        changed: data.shared?.changed ?? {},
        at,
      },
      answers: (data.shared?.answers ?? {}) as Answers,
      statuses: (data.shared?.statuses ?? {}) as Record<string, ExerciseStatus>,
      entitlements: Array.isArray(data.entitlements) ? (data.entitlements as Entitlement[]) : null,
    };
  } catch {
    return null;
  }
}

export type SharedSave =
  | { saved: true }
  | { saved: false; clash: { name: string | null; at: string | null }; theirs: unknown };

/**
 * Save one shared answer.
 *
 * A refusal because the other person wrote first is not an error to try again:
 * it comes back as `saved: false` with their answer, so the page can ask which
 * one to keep. Anything else throws, and the saver retries it as before.
 */
export async function saveSharedAnswer(item: {
  exerciseId: string;
  fieldId: string;
  value: unknown;
  loadedAt: string;
  force?: boolean;
}): Promise<SharedSave> {
  const res = await fetch("/api/household/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`shared answer not saved (${res.status})`);
  const data = await res.json();
  if (data.saved) return { saved: true };
  return { saved: false, clash: { name: data.conflict?.name ?? null, at: data.conflict?.at ?? null }, theirs: data.theirs };
}

/** A shared page is finished for both of them or for neither. */
export async function saveSharedStatus(exerciseId: string, status: ExerciseStatus): Promise<void> {
  const res = await fetch("/api/household/status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ exerciseId, status }),
  });
  if (!res.ok) throw new Error(`shared progress not saved (${res.status})`);
}
