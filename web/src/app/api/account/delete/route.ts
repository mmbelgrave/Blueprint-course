/*
 * "Delete everything I wrote", and, separately, "delete my account as well".
 *
 * These used to be one button that always did both, because the service role
 * key was present and deleting the sign-in account cascades every row away.
 * Somebody who had paid for the course and wanted to start their workbook
 * again lost the course with it (Mwata, 20 October), and the screen never
 * said that would happen.
 *
 * So the rows are deleted by name, and the account is only closed when the
 * person asks for that in so many words. What is kept when the account stays:
 * the purchase, the consent record and the withdrawal record, which are the
 * three things we have to be able to show.
 */
import { WRITTEN_BY_PERSON } from "@/lib/forget-account";
import { closeSeatsFor, deletePictures } from "@/lib/forget-account-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sessionUser, supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    return Response.json({ error: "Not available in preview mode." }, { status: 503 });
  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  const user = auth.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  // Asked for in the body, never assumed: the default is to keep the account.
  const body = await request.json().catch(() => ({}) as { account?: unknown });
  const alsoAccount = (body as { account?: unknown }).account === true;

  const admin = supabaseAdmin();
  if (admin) await deletePictures(admin, user.id);

  /*
   * The rows go first, by name, whether or not the account follows. Deleting
   * the account would cascade them away, but then a failure halfway through
   * would leave somebody signed out of an account that still holds their
   * answers, and nothing here would know which tables had gone.
   */
  const db = admin ?? supabase;
  for (const table of WRITTEN_BY_PERSON) {
    const { error } = await db.from(table).delete().eq("user_id", user.id);
    if (error) {
      console.error(`account delete: failed on ${table}`);
      return Response.json({ error: "Not everything could be deleted. Please try again." }, { status: 500 });
    }
  }

  if (alsoAccount && admin) {
    /*
     * The seat before the account (item B4d). A buyer's seat row goes with
     * their account, so the ending has to be written down first, or the
     * partner is never told and their answers sit there for ever.
     */
    await closeSeatsFor(admin, user.id).catch(() => undefined);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("account delete: the rows are gone, the account is not");
      await supabase.auth.signOut();
      return Response.json({ deleted: true, accountDeleted: false, accountKept: "failed" });
    }
    await supabase.auth.signOut();
    return Response.json({ deleted: true, accountDeleted: true });
  }

  await supabase.auth.signOut();
  // Without the service role key the account cannot be closed from here.
  return Response.json({ deleted: true, accountDeleted: false, accountKept: alsoAccount ? "failed" : "asked" });
}
