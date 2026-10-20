// Admin access (brief 4.7): only an account whose email is in ADMIN_EMAIL.
// Checked on the server for every admin request — hiding a link is not security.
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminEmails } from "@/lib/admin-emails";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";

export async function isAdminRequest(): Promise<boolean> {
  const allowed = adminEmails();
  if (!allowed.length || !process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  const email = data.user?.email?.toLowerCase();
  return Boolean(email && allowed.includes(email));
}

/** The service-role client for an admin request, or a ready error response. */
export async function requireAdmin(): Promise<{ admin: SupabaseClient } | { error: Response }> {
  if (!(await isAdminRequest())) {
    return { error: Response.json({ error: "This page is only for the admin." }, { status: 403 }) };
  }
  const admin = supabaseAdmin();
  if (!admin) {
    return { error: Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set." }, { status: 503 }) };
  }
  return { admin };
}

/**
 * Rough cost estimate for claude-opus-5 in US dollars: input $5, output $25,
 * cache reads $0.50 per million tokens. Cache writes are not in the usage log,
 * so the real cost is a little higher.
 */
export function estimateCostUsd(input: number, output: number, cacheRead: number) {
  return (input * 5 + output * 25 + cacheRead * 0.5) / 1_000_000;
}
