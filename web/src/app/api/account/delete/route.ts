// "Delete everything": all answers, chats, notes, results, feedback, the
// profile — and the account itself when the server has the service role key.
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

// Every table the person can delete their own rows from (row-level security).
const OWN_TABLES = ["answers", "exercise_status", "conversations", "ai_profile", "part_results", "feedback", "profiles"];

export async function POST() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return Response.json({ error: "Not available in preview mode." }, { status: 503 });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const admin = supabaseAdmin();
  if (admin) {
    // Deleting the account removes every row too (all tables cascade on the user).
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (!error) {
      await supabase.auth.signOut();
      return Response.json({ deleted: true, accountDeleted: true });
    }
    console.error("account delete: could not delete the user, deleting rows instead");
  }

  for (const table of OWN_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) {
      console.error(`account delete: failed on ${table}`);
      return Response.json({ error: "Not everything could be deleted. Please try again." }, { status: 500 });
    }
  }
  await supabase.auth.signOut();
  // Without the service role key the sign-in account (email) itself remains.
  return Response.json({ deleted: true, accountDeleted: false });
}
