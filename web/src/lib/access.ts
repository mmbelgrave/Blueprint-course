/**
 * Who may open what (spec §6.0).
 *
 * Three different questions decide it, and they are answered here so they can
 * never disagree with each other:
 *
 *   1. Is it released?           A step can be written and still be closed.
 *   2. Is it free?               access.json says which pages and items are.
 *   3. Does this person own it?  Their entitlements say so.
 *
 * Every door asks this: the overview, a step page, a page inside a step, a
 * workbook PDF, a video, a print page and the API routes behind them.
 *
 * Nothing is imported here — not the content, not the database, not React — so
 * it can be tested on its own and used unchanged on the server, where the
 * answer actually counts. `access-app.ts` ties it to this app's own files.
 */

export type AccessConfig = {
  products: Record<string, { name: string; steps: number[] }>;
  free: { items: string[]; steps: number[]; pages: string[]; lessons: string[] };
};

/**
 * What a person holds. Only "active" counts; a refund or a revoke ends it.
 *
 * `ended_at` is when it stops opening anything. A refund sets it to the moment
 * the money went back; a withdrawal sets it three working days ahead, so the
 * person keeps their answers for a few days after pressing the button (Terms
 * §9). A date in the future changes nothing; a date in the past closes the
 * purchase without waiting for any job to run.
 */
export type Entitlement = {
  product: string;
  status: "active" | "refunded" | "revoked";
  ended_at?: string | null;
};

/** Does this purchase still open anything, right now? */
export function counts(e: Entitlement, now: Date | string = new Date()): boolean {
  if (e.status !== "active") return false;
  if (!e.ended_at) return true;
  return new Date(e.ended_at).getTime() > new Date(now).getTime();
}

/**
 * The day access ends, when it is already set and still ahead.
 *
 * A withdrawal sets `ended_at` three days out rather than closing the door at
 * once, so for those three days the app has to say so: the person is still in
 * the course, and the course is going to stop.
 */
export function endingSoon(entitlements: Entitlement[], now: Date | string = new Date()): string | null {
  const at = new Date(now).getTime();
  const dates = entitlements
    .filter((e) => e.status === "active" && e.ended_at && new Date(e.ended_at).getTime() > at)
    .map((e) => e.ended_at as string)
    .sort();
  return dates[0] ?? null;
}

export type Verdict =
  | { open: true; because: "free" | "owned" }
  | { open: false; why: "not-released" | "not-bought" };

export type Ask = {
  /** Is the step released at all (journey.json, in_app)? */
  released: boolean;
  entitlements: Entitlement[];
  /** False until buying exists (§6.1): then a signed-in person may open anything released. */
  requirePurchase: boolean;
  config: AccessConfig;
};

/** Every step the person's active entitlements add up to, lowest first. */
export function ownedSteps(entitlements: Entitlement[], config: AccessConfig): number[] {
  const steps = new Set<number>();
  for (const e of entitlements) {
    if (!counts(e)) continue;
    for (const s of config.products[e.product]?.steps ?? []) steps.add(s);
  }
  return [...steps].sort((a, b) => a - b);
}

export function stepAccess(step: number, ask: Ask): Verdict {
  if (!ask.released) return { open: false, why: "not-released" };
  // Until buying exists this is how the app behaves today, so switching
  // requirePurchase on is the only thing that can ever take access away.
  if (!ask.requirePurchase) return { open: true, because: "owned" };
  if (ask.config.free.steps.includes(step)) return { open: true, because: "free" };
  if (ownedSteps(ask.entitlements, ask.config).includes(step)) return { open: true, because: "owned" };
  return { open: false, why: "not-bought" };
}

/**
 * One page. A free page (1.2, the Ordinary Tuesday) opens inside a step nobody
 * has bought — that is the point of it. A page in a step that is not released
 * stays shut either way.
 */
export function pageAccess(pageId: string, step: number, ask: Ask): Verdict {
  if (!ask.released) return { open: false, why: "not-released" };
  if (ask.requirePurchase && ask.config.free.pages.includes(pageId)) return { open: true, because: "free" };
  return stepAccess(step, ask);
}

/**
 * One lesson of a step, in Modules. A free lesson — the Step 1 video, so people
 * meet Mwata before they buy — opens although the step is not owned. The key is
 * the step and the part: "step-1:p1".
 */
export function lessonAccess(stepId: string, lessonId: string, step: number, ask: Ask): Verdict {
  if (!ask.released) return { open: false, why: "not-released" };
  if (ask.requirePurchase && ask.config.free.lessons.includes(`${stepId}:${lessonId}`)) {
    return { open: true, because: "free" };
  }
  return stepAccess(step, ask);
}

/** A course item that is not a step: the Introduction (§6.3a). */
export function itemAccess(itemId: string, ask: Omit<Ask, "released">): Verdict {
  if (!ask.requirePurchase) return { open: true, because: "owned" };
  if (ask.config.free.items.includes(itemId)) return { open: true, because: "free" };
  return { open: false, why: "not-bought" };
}

/**
 * A free account: signed in, nothing bought (§6.2). Only ever true once buying
 * is required — until then nobody is treated as free, which is why switching
 * `requirePurchase` on is the one thing that can change what people have.
 *
 * What this hides is not punishment. A free account has no AI partner, so it
 * is not asked to consent to one; it has no picture board, so it is not
 * promised picture storage. The screens show what is true for the person
 * in front of them.
 */
export function isFreeAccount(ask: Pick<Ask, "entitlements" | "requirePurchase" | "config">): boolean {
  if (!ask.requirePurchase) return false;
  return ownedSteps(ask.entitlements, ask.config).length === 0;
}

/** What to say on a closed door, so every one of them says the same thing. */
export const closedBecause = (why: "not-released" | "not-bought") =>
  why === "not-released"
    ? "This step is not open yet."
    : "This step is part of the course. Get Phase 1 to open it.";
