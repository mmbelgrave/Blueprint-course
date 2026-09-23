// Admin overview (brief 4.7). Only for the admin — checked on the server.
import { buildOverview } from "@/lib/admin-overview";
import { requireAdmin } from "@/lib/admin-server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    return Response.json({ participants: await buildOverview(auth.admin) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
