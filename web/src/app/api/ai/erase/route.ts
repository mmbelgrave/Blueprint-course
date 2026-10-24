/*
 * "Delete my chats and notes now" (lawyer, 24 October, item B3).
 *
 * Asked the moment somebody switches their AI partner off, because that is
 * when the question occurs to them. It takes away the two things the AI
 * partner made and nothing else: the chats, and the notes. The answers in the
 * workbook are the person's own work and are not touched, which is also what
 * the screen says.
 *
 * Deleting your own rows needs no service key, so this works even where the
 * service key is missing.
 */
import { sessionUser, supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return fail(503, "That is not set up yet.");
  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  if (!auth.user) return fail(401, "Please sign in again.");

  for (const table of ["conversations", "ai_profile"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", auth.user.id);
    if (error) {
      console.error(`ai erase: failed on ${table}`);
      return fail(500, "That could not be deleted. Please try again.");
    }
  }
  return Response.json({ deleted: true });
}
