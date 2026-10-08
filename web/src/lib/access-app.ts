/**
 * The access rules (access.ts) tied to this app's own files: access.json for
 * what each product contains and what is free, journey.json for what is
 * released, and one switch for whether buying is required yet.
 *
 * Used by the browser and by the server. The browser copy decides what to draw;
 * the server copy decides what may actually be read, and that is the one that
 * counts.
 */
import accessRaw from "@/content/access.json";
import {
  isFreeAccount,
  itemAccess,
  lessonAccess,
  pageAccess,
  stepAccess,
  type AccessConfig,
  type Entitlement,
  type Verdict,
} from "@/lib/access";
import { stepIsOpen } from "@/lib/content";

export const accessConfig = accessRaw as unknown as AccessConfig;

/**
 * Off until purchases exist (§6.1). While it is off, everyone signed in may
 * open every released step — exactly as the app behaves today, so turning it on
 * is a deliberate act and the only way anyone can lose access.
 */
export const requirePurchase = process.env.NEXT_PUBLIC_REQUIRE_PURCHASE === "true";

// One released-check for the whole app: content.ts owns it, this reuses it.
const released = stepIsOpen;

const ask = (step: number, entitlements: Entitlement[]) => ({
  released: released(step),
  entitlements,
  requirePurchase,
  config: accessConfig,
});

export const stepFor = (step: number, entitlements: Entitlement[]): Verdict => stepAccess(step, ask(step, entitlements));

export const pageFor = (pageId: string, step: number, entitlements: Entitlement[]): Verdict =>
  pageAccess(pageId, step, ask(step, entitlements));

export const lessonFor = (
  stepId: string,
  lessonId: string,
  step: number,
  entitlements: Entitlement[],
): Verdict => lessonAccess(stepId, lessonId, step, ask(step, entitlements));

export const itemFor = (itemId: string, entitlements: Entitlement[]): Verdict =>
  itemAccess(itemId, { entitlements, requirePurchase, config: accessConfig });

/** Is this person on a free account? Every screen that thins itself asks this. */
export const isFree = (entitlements: Entitlement[]): boolean =>
  isFreeAccount({ entitlements, requirePurchase, config: accessConfig });

/** The products a person could be given, for the Admin grant list. */
export const products = Object.entries(accessConfig.products).map(([id, p]) => ({ id, ...p }));
