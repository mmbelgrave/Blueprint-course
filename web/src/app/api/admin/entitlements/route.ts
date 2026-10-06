// Giving and ending access by hand (spec §6.1): for testers before the shop is
// open, for a complimentary place, and for putting right anything a webhook got
// wrong. Only the admin, checked on the server, and written with the service
// role so row-level security stays shut to everyone else.
import { requireAdmin } from "@/lib/admin-server";
import { accessConfig } from "@/lib/access-app";

export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: { userId?: string; product?: string; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "We could not read that request.");
  }
  const userId = String(body.userId ?? "");
  const product = String(body.product ?? "");
  if (!userId) return fail(400, "Which person?");
  if (!accessConfig.products[product]) return fail(400, `There is no product called "${product}".`);

  // Giving the same product twice would leave two live rows saying the same
  // thing, so an existing one is simply brought back to life.
  const { data: existing } = await auth.admin
    .from("entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("product", product)
    .eq("source", "granted")
    .maybeSingle();

  const { error } = existing
    ? await auth.admin
        .from("entitlements")
        .update({ status: "active", ended_at: null, note: body.note ?? null })
        .eq("id", existing.id)
    : await auth.admin.from("entitlements").insert({
        user_id: userId,
        product,
        status: "active",
        source: "granted",
        note: body.note ?? "complimentary",
      });

  if (error) return fail(500, "That was not saved.");
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  let body: { id?: number; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "We could not read that request.");
  }
  const id = Number(body.id);
  const status = String(body.status ?? "");
  if (!Number.isFinite(id)) return fail(400, "Which entitlement?");
  if (!["active", "revoked", "refunded"].includes(status)) return fail(400, "That is not a status we use.");

  const { error } = await auth.admin
    .from("entitlements")
    .update({ status, ended_at: status === "active" ? null : new Date().toISOString() })
    .eq("id", id);

  if (error) return fail(500, "That was not saved.");
  return Response.json({ ok: true });
}
