/**
 * The access rules on the server, where the answer actually counts (spec §6.0).
 *
 * The browser decides what to draw; this decides what may be read, spent or
 * sent. Every API route that hands something over asks here.
 */
import { ownedSteps, type Entitlement } from "@/lib/access";
import { accessConfig, requirePurchase } from "@/lib/access-app";

type Queryable = {
  from: (table: string) => { select: (columns: string) => PromiseLike<{ data: unknown }> };
};

/** What this person owns, read with their own session, so RLS still applies. */
export async function myEntitlements(supabase: Queryable): Promise<Entitlement[]> {
  const { data } = await supabase.from("entitlements").select("product, status");
  return (data ?? []) as Entitlement[];
}

/**
 * A free account: signed in, nothing bought (§6.2). Only ever true once buying
 * is required — until then nobody is treated as free, which is why switching
 * `requirePurchase` on is the one thing that can change what people have.
 */
export function isFreeAccount(entitlements: Entitlement[]): boolean {
  if (!requirePurchase) return false;
  return ownedSteps(entitlements, accessConfig).length === 0;
}
