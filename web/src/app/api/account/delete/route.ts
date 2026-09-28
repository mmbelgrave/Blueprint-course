// "Delete everything": all answers, chats, notes, results, feedback, the
// profile — and the account itself when the server has the service role key.
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

// Every table the person can delete their own rows from (row-level security).
const OWN_TABLES = ["answers", "exercise_status", "conversations", "ai_profile", "part_results", "feedback", "profiles"];

/**
 * Pictures live in the "boards" store, not in a table, so deleting the account
 * does not remove them by itself. Everything under the person's own folder goes.
 */
async function deletePictures(client: NonNullable<ReturnType<typeof supabaseAdmin>>, userId: string) {
  const paths: string[] = [];
  const { data: pages } = await client.storage.from("boards").list(userId);
  for (const page of pages ?? []) {
    const { data: files } = await client.storage.from("boards").list(`${userId}/${page.name}`);
    for (const file of files ?? []) paths.push(`${userId}/${page.name}/${file.name}`);
  }
  if (paths.length) {
    const { error } = await client.storage.from("boards").remove(paths);
    if (error) console.error("account delete: some pictures could not be removed");
  }
}

export async function POST() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return Response.json({ error: "Not available in preview mode." }, { status: 503 });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const admin = supabaseAdmin();
  if (admin) {
    await deletePictures(admin, user.id);
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
