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
  free: { items: string[]; steps: number[]; pages: string[] };
};

/** What a person holds. Only "active" counts; a refund or a revoke ends it. */
export type Entitlement = { product: string; status: "active" | "refunded" | "revoked" };

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
    if (e.status !== "active") continue;
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

/** A course item that is not a step: the Introduction (§6.3a). */
export function itemAccess(itemId: string, ask: Omit<Ask, "released">): Verdict {
  if (!ask.requirePurchase) return { open: true, because: "owned" };
  if (ask.config.free.items.includes(itemId)) return { open: true, because: "free" };
  return { open: false, why: "not-bought" };
}

/** What to say on a closed door, so every one of them says the same thing. */
export const closedBecause = (why: "not-released" | "not-bought") =>
  why === "not-released"
    ? "This step is not open yet."
    : "This step is part of the course. Get Phase 1 to open it.";
