/**
 * The access rules on the server, where the answer actually counts (spec §6.0).
 *
 * The browser decides what to draw; this decides what may be read, spent or
 * sent. Every API route that hands something over asks here.
 */
import type { Entitlement } from "@/lib/access";
import { isFree } from "@/lib/access-app";

type Queryable = {
  from: (table: string) => { select: (columns: string) => PromiseLike<{ data: unknown }> };
};

/** What this person owns, read with their own session, so RLS still applies. */
export async function myEntitlements(supabase: Queryable): Promise<Entitlement[]> {
  const { data } = await supabase.from("entitlements").select("product, status");
  return (data ?? []) as Entitlement[];
}

/** A free account (§6.2). The same rule the screens use, asked on the server. */
export const isFreeAccount = (entitlements: Entitlement[]): boolean => isFree(entitlements);
