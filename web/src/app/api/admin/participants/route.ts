// Admin overview (brief 4.7). Only for the admin — checked on the server.
import { buildOverview } from "@/lib/admin-overview";
import { requireAdmin } from "@/lib/admin-server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    /*
     * The last webhooks Lemon Squeezy sent (§6.1). A payment that opened
     * nothing has to be visible here, or the first Mwata hears of it is the
     * buyer asking where their course has got to.
     */
    const { data: webhooks } = await auth.admin
      .from("webhook_events")
      .select("event, order_id, email, test_mode, outcome, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    return Response.json({
      participants: await buildOverview(auth.admin),
      emailNotifications: !!process.env.RESEND_API_KEY,
      webhooks: webhooks ?? [],
      buyingRequired: process.env.NEXT_PUBLIC_REQUIRE_PURCHASE === "true",
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
