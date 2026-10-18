/**
 * The access rules on the server, where the answer actually counts (spec §6.0).
 *
 * The browser decides what to draw; this decides what may be read, spent or
 * sent. Every API route that hands something over asks here.
 */
import type { Entitlement } from "@/lib/access";
import { isFree } from "@/lib/access-app";
import { householdEntitlements, householdOf } from "@/lib/household-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Queryable = {
  from: (table: string) => { select: (columns: string) => PromiseLike<{ data: unknown }> };
};

/** What this person owns, read with their own session, so RLS still applies. */
export async function myEntitlements(supabase: Queryable): Promise<Entitlement[]> {
  const { data } = await supabase.from("entitlements").select("product, status, ended_at");
  return (data ?? []) as Entitlement[];
}

/** A free account (§6.2). The same rule the screens use, asked on the server. */
export const isFreeAccount = (entitlements: Entitlement[]): boolean => isFree(entitlements);

/**
 * What this person may open, counting the seat they sit on (spec §6.8).
 *
 * **Every door asks this, not `myEntitlements`.** A partner owns nothing of
 * their own: their access is the buyer's, read live so a refund ends it in the
 * same moment. Review round 6 found the seat opening no doors at all because
 * three routes asked the narrower question, so the rule is now in one place
 * with one name.
 */
export async function myAccess(supabase: Queryable, userId: string): Promise<Entitlement[]> {
  const mine = await myEntitlements(supabase);
  const admin = supabaseAdmin();
  if (!admin) return mine;
  const { household } = await householdOf(admin, userId);
  if (household.role !== "partner") return mine;
  return (await householdEntitlements(admin, household, mine)) as Entitlement[];
}
